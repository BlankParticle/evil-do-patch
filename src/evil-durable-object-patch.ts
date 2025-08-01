import { DurableObject as _DurableObject, env } from 'cloudflare:workers';

const originalProto = _DurableObject.prototype;
_DurableObject.prototype = new Proxy(originalProto, {
	get(target, prop, receiver) {
		const parentClass = Object.getPrototypeOf(receiver);
		const methods = Object.getOwnPropertyNames(parentClass);
		methods.forEach((method) => {
			if (
				method === 'constructor' ||
				parentClass[`__patched__${method}`] ||
				method.startsWith('__patched__')
			)
				return;
			console.log(`Patching [${method}]`);
			const originalMethod = parentClass[method];
			parentClass[method] = function (this: any, ...args: any[]) {
				console.log(`[${method}]`, this, args);
				let name;
				if (args[args.length - 1].__INJECTED_NAME__) {
					name = args.pop().__INJECTED_NAME__;
				}
				console.log(`[${method}] Calling original method`);
				return originalMethod.call(
					{ ...this, ctx: { ...receiver.ctx, id: { ...receiver.ctx.id, name } } },
					...args,
				);
			};
			Object.defineProperty(parentClass, `__patched__${method}`, { value: true, writable: true });
		});
		return target[prop as keyof typeof target];
	},
});

for (const key in env) {
	const binding = env[key as keyof typeof env];
	const proto = Object.getPrototypeOf(binding);
	if (proto.constructor.name === 'DurableObjectNamespace') {
		const originalGet = proto.get;
		proto.get = function (this: any, id: DurableObjectId) {
			const stub = originalGet.call(this, id);
			const proxyStub = new Proxy(stub, {
				get(target, prop, receiver) {
					const originalMethod = target[prop as keyof typeof target];
					target[prop] = (...args: any[]) => {
						args.push({ __INJECTED_NAME__: id.name });
						return originalMethod(...args);
					};
					return target[prop];
				},
			});
			return proxyStub;
		};
	}
}
