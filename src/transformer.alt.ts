import { Jimp } from 'jimp';
import { Payload } from './types';
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class Transformer extends WorkflowEntrypoint<Env, Payload> {
	async run(event: WorkflowEvent<Payload>, step: WorkflowStep) {
		const id = event.instanceId;
		const fileType = event.payload.fileType;
		const { resize, format, filter } = event.payload.options;

		let file: any = await this.env.R2.get(id);
		file = await file.arrayBuffer();

		if (resize) {
			await step.do('resize image', async () => {
				// const file = await this.env.R2.get(id);
				// const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				const image = await Jimp.fromBuffer(file);
				image.resize(resize);
				// await this.env.R2.put(id, await image.getBuffer(fileType));
				file = await image.getBuffer(fileType);
			});
		}

		if (filter) {
			await step.do('filter image', async () => {
				// const file = await this.env.R2.get(id);
				// const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				const image = await Jimp.fromBuffer(file);
				const fOptions = Object.keys(filter).map((n) => {
					const fValue = (filter as any)[n];
					return { apply: n, params: fValue ? [fValue] : undefined };
				}) as any;
				console.log(fOptions);
				image.color(fOptions);
				// await this.env.R2.put(id, await image.getBuffer(fileType));

				file = await image.getBuffer(fileType);
			});
		}

		if (format) {
			await step.do('format image', async () => {
				// const file = await this.env.R2.get(id);
				// const image = await Jimp.fromBuffer(await file!.arrayBuffer());
				const image = await Jimp.fromBuffer(file);
				const mimes = { png: 'image/png', bmp: 'image/bmp', gif: 'image/gif', jpeg: 'image/jpeg', tiff: 'image/tiff' } as const;
				// await this.env.R2.put(id, await image.getBuffer(mimes[format]));

				file = await image.getBuffer(fileType);
			});
		}

		await this.env.R2.put(id, file);
	}
}
