import './evil-durable-object-patch';

import { DurableObject } from 'cloudflare:workers';

export class MyDurableObject extends DurableObject<Env> {
	hello(message: string) {
		console.log({ message, name: `The name is ${this.ctx.id.name}` });
		return { message, durableObjectName: this.ctx.id.name };
	}
	async helloAsync(msg: string) {
		console.log({ msg, name: `The Async name is ${this.ctx.id.name}` });
		return { msg, durableObjectName: this.ctx.id.name };
	}
}

export default {
	async fetch(request, env, ctx) {
		const doName = new URL(request.url).searchParams.get('name');
		if (!doName) {
			return Response.json({ error: 'No DO name provided' });
		}
		const id = env.MY_DURABLE_OBJECT.idFromName(doName);
		const stub = env.MY_DURABLE_OBJECT.get(id);
		const res = await stub.helloAsync('hello world');
		return Response.json({ res });
	},
} as ExportedHandler<Env>;
