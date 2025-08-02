import { DurableObject, RpcTarget } from 'cloudflare:workers';

export class RpcProxyTarget extends RpcTarget {
	constructor(
		public mainDo: any,
		public ctx: DurableObjectState,
		public env: any,
		public objectName: string,
	) {
		super();
	}
}

async function setName(this: InstanceType<typeof DurableObject>, durableObjectName: string) {
	await this.ctx.storage.put('__durableObjectName__', durableObjectName);
	const rpcTarget = new RpcProxyTarget(this, this.ctx, this.env, durableObjectName);

	const parentClass = Object.getPrototypeOf(this);
	const parentClassMethods = Object.getOwnPropertyNames(parentClass);
	parentClassMethods.forEach((method) => {
		Object.defineProperty(RpcProxyTarget.prototype, method, {
			value: function (this: RpcProxyTarget, ...args: any[]) {
				this.mainDo.ctx = {
					...this.mainDo.ctx,
					id: {
						...this.mainDo.ctx.id,
						name: this.objectName,
					},
				};
				return parentClass[method].call(this.mainDo, ...args);
			},
			writable: true,
			enumerable: true,
			configurable: true,
		});
	});

	return rpcTarget;
}

export function Nameable(target: any) {
	Object.defineProperty(target.prototype, '__setName__', {
		value: setName,
		writable: true,
		enumerable: true,
		configurable: true,
	});
	return target;
}

export function getNameable<T extends Rpc.DurableObjectBranded>(
	namespace: DurableObjectNamespace<T>,
	id: DurableObjectId,
): DurableObjectStub<T> & Disposable {
	if (!id.name) {
		throw new Error('Tried to get a Nameable Durable Object stub with a nameless DurableObjectId');
	}
	const stub = namespace.get(id);
	// @ts-expect-error
	const stubWithMetadata = stub.__setName__(id.name);
	return stubWithMetadata;
}
