import { z } from 'zod';

export type Bindings = {
	R2: R2Bucket;
	TRANSFORMER: Workflow;
};

export const Options = z.object({
	resize: z.object({ w: z.number().gte(1), h: z.number().gte(1) }).optional(),
	format: z.enum(['bmp', 'gif', 'jpeg', 'png']).optional(),
	filter: z
		.object({ greyscale: z.string().optional(), hue: z.number().gte(1).optional(), saturate: z.number().gte(1).optional() })
		.optional(),
});

export type Payload = { options: z.infer<typeof Options>; fileType: 'image/png' | 'image/bmp' | 'image/gif' | 'image/jpeg' };
