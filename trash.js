function replaceThis(obj, replacement) {
	if (typeof obj === 'object' && obj !== null) {
		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				obj[index] = replaceThis(item, replacement);
			});
		} else {
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					obj[key] = replaceThis(obj[key], replacement);
				}
			}
		}
	} else if (obj === '$this') {
		return replacement;
	}
	return obj;
}

const obj = {data: '$this', array: [1, 2, 3, '$this'], a: {b: {c: {d: '$this'}}}};
const replacement = {example: 'replacement object'};

const newObj = replaceThis(obj, replacement);
console.log(newObj);
