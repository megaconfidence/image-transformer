import qs from 'qs';
import { Hono } from 'hono';
import { Options, Bindings } from './types';
export { Transformer } from './transformer';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/view/:id', async (c) => {
	const id = c.req.param('id');
	const file = await c.env.R2.get(id);
	return new Response(file!.body);
});

app.get('/status/:id', async (c) => {
	const id = c.req.param('id');
	try {
		let workFlow = await c.env.TRANSFORMER.get(id);
		return c.json({ ...(await workFlow.status()) });
	} catch (error: any) {
		return c.json({ status: 'errored', error: error.message });
	}
});

app.post('/upload', async (c) => {
	const queryParams = qs.parse(c.req.url.split('?')[1], {
		decoder: (v) => (/^(\d+|\d*\.\d+)$/.test(v) ? parseFloat(v) : v),
	});
	const { data: options, error } = Options.safeParse(queryParams);
	if (error) return c.json(error);

	const body = await c.req.parseBody();
	const file = body[Object.keys(body)[0]] as File;
	const id = crypto.randomUUID();
	await c.env.R2.put(id, file);

	let workFlow = await c.env.TRANSFORMER.create({ params: { options, fileType: file.type }, id });
	return Response.json({
		id: workFlow.id,
		details: await workFlow.status(),
	});
});
export default app;
