const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
var size = { x: 8, y: 8 };
var axis = { x: 1, y: 1 };

document.onreadystatechange = function () {
	let cellMouseDown, isCellChecked;
	const toolbar = document.querySelector('.toolbar');
	const sizeX = document.getElementById('sizeX');
	const sizeY = document.getElementById('sizeY');
	const decimal = document.getElementById('decimal');
	const display = document.getElementById('display');

	window.addEventListener('resize', () => {
		scaleDisplay();
	});
	window.addEventListener('hashchange', () => {
		parseHash(window.location.hash);
		history.pushState(undefined, undefined, '.');
	});
	document.addEventListener('keydown', (e) => {
		if (document.activeElement.type === 'number') return;
		switch (e.key) {
			case '-':
				decimal.stepUp(-1);
				break;
			case '=':
				decimal.stepUp(1);
				break;
			case 'Backspace':
			case 'Delete':
				decimal.value = 0;
				break;
			case 'ArrowRight':
				sizeX.stepUp(2);
			case 'ArrowLeft':
				sizeX.stepUp(-1);
				changeField(sizeX);
				return;
			case 'ArrowUp':
				if (sizeY.disabled) return;
				sizeY.stepUp(2);
			case 'ArrowDown':
				if (sizeY.disabled) return;
				sizeY.stepUp(-1);
				changeField(sizeY);
				return;
			default: return;
		}
		genDisplay();
	});
	decimal.addEventListener('input', () => {
		genDisplay();
	});
	toolbar.addEventListener('focusin', (e) => {
		if (e.target.type === 'number')
			e.target.select();
	});
	toolbar.addEventListener('click', (e) => {
		if (e.target.hasAttribute('data-field')) {
			const field = document.getElementById(e.target.dataset.field);
			if (field.disabled) return;
			field.stepUp(e.target.value);
			changeField(field);
			return;
		}
		switch (e.target.id) {
			case 'grid':
				display.classList.toggle('no-grid');
				break;
			case 'about':
				document.getElementById('about-bg').style.display = 'block';
				break;
			case 'clear':
				decimal.value = 0;
				genDisplay();
				break;
			case 'invert':
				invertDisplay();
				break;
			case 'copy':
				copyNum();
				break;
			case 'link':
				copyLink();
		}
	});
	toolbar.addEventListener('change', (e) => {
		if (e.target.id === 'grid') return;
		else if (e.target.id === 'decimal')
			genDisplay();
		else if (sizeX.value <= 128 && sizeY.value <= 128) {
			sizeY.disabled = document.getElementById('square').checked;
			if (sizeY.disabled)
				sizeY.value = sizeX.value;
			drawDisplay();
		}
	});
	document.getElementById('about-bg').addEventListener('click', (e) => {
		if (e.target !== e.currentTarget) return;
		e.currentTarget.style.display = 'none';
	});
	toolbar.addEventListener('wheel', (e) => {
		let field;
		switch (e.target.id) {
			case 'sizeX':
			case 'sizeXDecr':
			case 'sizeXIncr':
				field = document.getElementById('sizeX');
				break;
			case 'sizeY':
			case 'sizeYDecr':
			case 'sizeYIncr':
				field = document.getElementById('sizeY');
				break;
			case 'decimal':
			case 'decimalDecr':
			case 'decimalIncr':
				field = document.getElementById('decimal');
				break;
			default: return;
		}
		if (field.disabled) return;
		field.stepUp(e.deltaY > 0 ? -1 : 1);
		changeField(field);
		e.preventDefault();
	});
	display.addEventListener('mousedown', (e) => {
		if (!e.target.htmlFor) return;
		const cell = document.getElementById(e.target.htmlFor);
		cell.checked ^= 1;
		isCellChecked = cell.checked;
		cellMouseDown = cell;
		e.preventDefault();
		genNumber();
	});
	display.addEventListener('mouseup', (e) => {
		if (!e.target.htmlFor) return;
		const cell = document.getElementById(e.target.htmlFor);
		if (cellMouseDown === cell)
			cell.checked ^= 1;
		cellMouseDown = null;
	});
	display.addEventListener('mouseover', (e) => {
		if (!cellMouseDown || !e.target.htmlFor) return;
		document.getElementById(e.target.htmlFor).checked = isCellChecked;
		genNumber();
	});
	document.body.addEventListener('mouseup', () => {
		cellMouseDown = null;
	});

	if (window.location.hash)
		parseHash(window.location.hash);
	else if (localStorage.settings)
		parseHash(localStorage.settings);
	if (window.location.host)
		history.pushState(undefined, undefined, '.');

	drawDisplay();
};

function drawDisplay() {
	const display = document.getElementById('display');
	const frag = document.createDocumentFragment();
	size.x = parseInt(document.getElementById('sizeX').value) || 1;
	size.y = !document.getElementById('square').checked
		? parseInt(document.getElementById('sizeY').value) || 1
		: size.x;
	axis.x = document.getElementById('axisXL').checked ? -1 : 1;
	axis.y = document.getElementById('axisYU').checked ? -1 : 1;

	localStorage.settings = genSettings();
	scaleDisplay();
	while (display.childNodes.length)
		display.removeChild(display.lastChild);
	for (var i = 0, iLen = size.x * size.y; i < iLen; i++) {
		let idx = axis.y > 0 ? i : iLen - i - 1;
		idx = axis.x + axis.y !== 0 ? idx : idx - idx % size.x * 2 + size.x - 1;
		const cell = document.createElement('input');
		cell.type = 'checkbox';
		cell.className = 'cell';
		cell.id = idx;
		frag.appendChild(cell);
		const label = document.createElement('label');
		label.htmlFor = idx;
		frag.appendChild(label);
		if ((i + 1) % size.x === 0)
			frag.appendChild(document.createElement('br'));
	}
	display.appendChild(frag);
	genDisplay();
}

function scaleDisplay() {
	const display = document.getElementById('display');
	if ((size.x * 4 + 4) * 16 <= document.body.scrollWidth - 30)
		display.style.fontSize = '100%';
	else
		display.style.fontSize = (document.body.clientWidth - 30) / (size.x * 4 + 4) + 'px';
}

function genDisplay() {
	let num = BigInt(document.getElementById('decimal').value);
	for (var i = 0, iLen = size.x * size.y; i < iLen; i++) {
		document.getElementById(i).checked = num % 2n;
		num >>= 1n;
	}
}

function genNumber() {
	let num = 0n;
	document.querySelectorAll('.cell').forEach((el) => {
		num += !el.checked ? 0n : 2n ** BigInt(el.id);
	});
	document.getElementById('decimal').value = num.toString();
}

function invertDisplay() {
	document.querySelectorAll('.cell').forEach((el) => {
		el.checked ^= 1;
	});
	genNumber();
}

function changeField(el) {
	el.dispatchEvent(new Event('change', { 'bubbles': true }));
}

function genSettings() {
	return size.x + (size.x === size.y ? '' : '.' + size.y)
		+ (axis.x === -1 ? 'L' : 'R') + (axis.y === -1 ? 'U' : 'D');
}

function genHash() {
	const numHash = encodeBase64(BigInt(document.getElementById('decimal').value));
	return genSettings() + (!numHash ? '' : '&' + numHash);
}

function parseHash(hash) {
	const square = document.getElementById('square');
	let res = /(\d+)(?:\.(\d+))?(L|R)(U|D)(?:&([\w-]+))?/i.exec(hash);
	if (!res) return;
	sizeX.value = parseInt(res[1]) || size.x;
	if (parseInt(res[2])) {
		square.checked = false;
		sizeY.value = parseInt(res[2]);
	} else
		square.checked = true;
	document.getElementById('axisX' + res[3].toUpperCase()).checked = true;
	document.getElementById('axisY' + res[4].toUpperCase()).checked = true;
	if (res[5])
		document.getElementById('decimal').value = decodeBase64(res[5]);
	changeField(sizeX);
}

function encodeBase64(num) {
	let str = '';
	while (num) {
		str = base64[num & 63n] + str;
		num >>= 6n;
	}
	return str;
}

function decodeBase64(str) {
	let num = 0n;
	for (var i = 0; i < str.length; i++) {
		num <<= 6n;
		num += BigInt(base64.indexOf(str[i]));
	}
	return num;
}

function copyNum() {
	const copy = document.getElementById('copy');
	document.getElementById('decimal').select();
	document.execCommand('copy');
	copy.classList.add('copied');
	setTimeout(() => {
		copy.classList.remove('copied');
	}, 1000);
}

function copyLink() {
	const linkText = document.getElementById('link-text');
	const link = document.getElementById('link');
	linkText.value = window.location.href.split('#')[0] + '#' + genHash();
	linkText.select();
	document.execCommand('copy');
	linkText.blur();
	link.classList.add('copied');
	setTimeout(() => {
		link.classList.remove('copied');
	}, 1000);
}
