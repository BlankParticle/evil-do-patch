import { DurableObject } from 'cloudflare:workers';
import { getNameable, Nameable } from './nameable';

@Nameable
export class MyDurableObject extends DurableObject<Env> {
	fetch(request: Request): Response {
		return new Response(`Hello, world! ${this.ctx.id.name}`, { status: 200 });
	}

	computeMessage(userName: string) {
		console.log({
			userName: userName,
			durableObjectName: this.ctx.id.name,
		});
		return `Hello, ${userName}! The name of this DO is ${this.ctx.id.name}`;
	}

	async simpleGreeting(userName: string) {
		this.ctx.storage.setAlarm(Date.now() + 60_000);
		return `Hello, ${userName}! This doesn't use the DO identifier.`;
	}

	async alarm(alarmInfo?: AlarmInvocationInfo): Promise<void> {
		// as Alarms are automatically called they don't get the metadata, but we can use the name from storage
		const name = await this.ctx.storage.get('__durableObjectName__');
		console.log({
			alarmInfo,
			durableObjectName: name,
			// This might work, might not depending on if the Durable Object is was killed and restarted
			objectNameFromCtx: `Name: ${this.ctx.id.name}`,
		});
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const urlName = new URL(request.url).searchParams.get('name');
		if (!urlName) {
			return new Response('No name provided', { status: 400 });
		}
		const id = env.MY_DURABLE_OBJECT.idFromName(urlName);
		const stub = getNameable(env.MY_DURABLE_OBJECT, id);

		const greeting = await stub.simpleGreeting('world');
		const computeMessage = await stub.computeMessage('world');

		return new Response(greeting + '\n' + computeMessage, { status: 200 });
	},
} satisfies ExportedHandler<Env>;
