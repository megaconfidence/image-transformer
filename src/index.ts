import qs from 'qs';
import { z } from 'zod';
import { Hono } from 'hono';
import { Jimp } from 'jimp';
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type Bindings = {
	R2: R2Bucket;
	TRANSFORMER: Workflow;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/view/:id', async (c) => {
	const id = c.req.param('id');
	const file = await c.env.R2.get(id);
	return new Response(file!.body);
});

app.get('/status/:id', async (c) => {
	const id = c.req.param('id');
	try {
		let instance = await c.env.TRANSFORMER.get(id);
		return c.json({ ...(await instance.status()) });
	} catch (error: any) {
		return c.json({ status: 'errored', error: error.message });
	}
});

const Options = z.object({
	resize: z.object({ w: z.number().gte(1), h: z.number().gte(1) }).optional(),
	format: z.enum(['bmp', 'gif', 'jpeg', 'png']).optional(),
	filter: z
		.object({ greyscale: z.string().optional(), hue: z.number().gte(1).optional(), saturate: z.number().gte(1).optional() })
		.optional(),
});

type Payload = { options: z.infer<typeof Options>; filetype: 'image/png' | 'image/bmp' | 'image/gif' | 'image/jpeg' };

export class Transformer extends WorkflowEntrypoint<Env, Payload> {
	async run(event: WorkflowEvent<Payload>, step: WorkflowStep) {
		const id = event.instanceId;
		const filetype = event.payload.filetype;
		const { resize, format, filter } = event.payload.options;

		if (resize) {
			await step.do('resize image', async () => {
				const file = await this.env.R2.get(id);
				const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				image.resize(resize);
				await this.env.R2.put(id, await image.getBuffer(filetype));
			});
		}

		if (filter) {
			await step.do('filter image', async () => {
				const file = await this.env.R2.get(id);
				const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				const fOptions = Object.keys(filter).map((n) => {
					const fValue = (filter as any)[n];
					return { apply: n, params: fValue ? [fValue] : undefined };
				}) as any;
				console.log(fOptions);
				image.color(fOptions);
				await this.env.R2.put(id, await image.getBuffer(filetype));
			});
		}

		if (format) {
			await step.do('format image', async () => {
				const file = await this.env.R2.get(id);
				const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				const mimes = { png: 'image/png', bmp: 'image/bmp', gif: 'image/gif', jpeg: 'image/jpeg', tiff: 'image/tiff' } as const;
				await this.env.R2.put(id, await image.getBuffer(mimes[format]));
			});
		}
	}
}

app.post('/upload', async (c) => {
	const query = qs.parse(c.req.url.split('?')[1], {
		decoder(v) {
			if (/^(\d+|\d*\.\d+)$/.test(v)) return parseFloat(v);
			return v;
		},
	});
	const { data: options, error } = Options.safeParse(query);
	if (error) return c.json(error);

	const body = await c.req.parseBody();
	const file = body[Object.keys(body)[0]] as File;
	const id = crypto.randomUUID();
	await c.env.R2.put(id, file);
	console.log({ filetype: file.type, ...options });

	let instance = await c.env.TRANSFORMER.create({ params: { options, filetype: file.type }, id });
	return Response.json({
		id: instance.id,
		details: await instance.status(),
	});
});
export default app;
