import { Jimp } from 'jimp';
import { Payload } from './types';
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class Transformer extends WorkflowEntrypoint<Env, Payload> {
	async run(event: WorkflowEvent<Payload>, step: WorkflowStep) {
		const id = event.instanceId;
		const fileType = event.payload.fileType;
		const { resize, format, filter } = event.payload.options;

		if (resize) {
			await step.do('resize image', async () => {
				const file = await this.env.R2.get(id);
				const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				image.resize(resize);
				await this.env.R2.put(id, await image.getBuffer(fileType));
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
				image.color(fOptions);
				await this.env.R2.put(id, await image.getBuffer(fileType));
			});
		}

		if (format) {
			await step.do('format image', async () => {
				const file = await this.env.R2.get(id);
				const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				const mimes = { png: 'image/png', bmp: 'image/bmp', gif: 'image/gif', jpeg: 'image/jpeg' } as const;
				await this.env.R2.put(id, await image.getBuffer(mimes[format]));
			});
		}
	}
}
