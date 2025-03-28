import { Jimp } from 'jimp';
import { Payload } from './types';
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class Transformer extends WorkflowEntrypoint<Env, Payload> {
	async run(event: WorkflowEvent<Payload>, step: WorkflowStep) {
		const id = event.instanceId;
		const fileType = event.payload.fileType;
		const { resize, format, filter } = event.payload.options;

		let file: any = await (await this.env.R2.get(id))?.arrayBuffer();

		if (resize) {
			await step.do('resize image', async () => {
				const image = await Jimp.fromBuffer(file);
				image.resize(resize);
				file = await image.getBuffer(fileType);
			});
		}

		if (filter) {
			await step.do('filter image', async () => {
				const image = await Jimp.fromBuffer(file);
				const fOptions = Object.keys(filter).map((n) => {
					const fValue = (filter as any)[n];
					return { apply: n, params: fValue ? [fValue] : undefined };
				}) as any;
				image.color(fOptions);
				file = await image.getBuffer(fileType);
			});
		}

		if (format) {
			await step.do('format image', async () => {
				const image = await Jimp.fromBuffer(file);
				const mimes = { png: 'image/png', bmp: 'image/bmp', gif: 'image/gif', jpeg: 'image/jpeg' } as const;
				file = await image.getBuffer(fileType);
			});
		}

		await this.env.R2.put(id, file);
	}
}
