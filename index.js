const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
var size = { x: 8, y: 8 };
var axis = { x: 1, y: 1 };
var number = 0n;

document.onreadystatechange = function () {
	const toolbar = document.querySelector('.toolbar');
	const sizeX = document.querySelector('.sizeX');
	const sizeY = document.querySelector('.sizeY');
	const display = document.getElementById('display');
	let cellMouseDown, isCellChecked;

	window.addEventListener('resize', () => {
		scaleDisplay();
	});
	window.addEventListener('hashchange', () => {
		parseHash(window.location.hash);
		history.pushState(undefined, undefined, '.');
	});
	toolbar.addEventListener('focusin', e => {
		if (/number|size.$/.test(e.target.className))
			e.target.select();
	});
	document.addEventListener('keydown', e => {
		if (/size.$/.test(e.target.className)) return;
		else if (e.target.classList.item(1) === 'number') {
			switch (e.target.classList.item(0)) {
				case 'hex':
					validate(e, /[^\dA-F]/i);
					return;
				case 'dec':
					validate(e, /[^\d]/);
					return;
				case 'bin':
					validate(e, /[^01]/);
				default: return;
			}
		}
		switch (e.key) {
			case '-':
				add(-1n);
				break;
			case '=':
				add(1n);
				break;
			case 'Backspace':
			case 'Delete':
				number = 0n;
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
			default: return;
		}
		syncNumber();
	});
	document.addEventListener('click', e => {
		if (e.target.className === 'cell') return;
		if (e.target.classList.contains('incr')) {
			const field = document.querySelector('.' + /^(\w+)/.exec(e.target.className)[0]);
			if (/size/.test(field.className)) {
				if (field.disabled) return;
				field.stepUp(e.target.value);
				changeField(field);
			} else
				add(BigInt(e.target.value));
			return;
		}
		const aboutBg = document.querySelector('.about-bg');
		switch (e.target.classList.item(0)) {
			case 'grid':
				display.classList.toggle('no-grid');
				break;
			case 'about':
				aboutBg.style.display = 'block';
				break;
			case 'about-bg':
				if (e.target !== aboutBg) return;
				aboutBg.style.display = 'none';
				break;
			case 'clear':
				number = 0n;
				syncNumber();
				break;
			case 'invert':
				invertDisplay();
				break;
			case 'copy':
				copyNum(e.target);
				break;
			case 'link':
				copyLink();
		}
	});
	toolbar.addEventListener('change', e => {
		if (e.target.id === 'grid') return;
		else if (/^(?:hex|dec|bin)/.test(e.target.className)) {
			if (e.target.value)
				syncNumber(e.target);
		} else if (sizeX.value <= 128 && sizeY.value <= 128) {
			sizeY.disabled = document.getElementById('square').checked;
			if (sizeY.disabled)
				sizeY.value = sizeX.value;
			drawDisplay();
		}
	});
	toolbar.addEventListener('wheel', e => {
		let field;
		switch (e.target.classList.item(0)) {
			case 'sizeX':
				field = document.querySelector('.sizeX');
				break;
			case 'sizeY':
				field = document.querySelector('.sizeY');
				break;
			case 'hex':
			case 'dec':
			case 'bin':
				add(e.deltaY > 0 ? -1n : 1n);
				e.preventDefault();
			default: return;
		}
		if (field.disabled) return;
		field.stepUp(e.deltaY > 0 ? -1 : 1);
		changeField(field);
		e.preventDefault();
	});
	display.addEventListener('mousedown', e => {
		if (!e.target.htmlFor) return;
		const cell = document.getElementById(e.target.htmlFor);
		cell.checked ^= 1;
		isCellChecked = cell.checked;
		cellMouseDown = cell;
		e.preventDefault();
		genNumber();
	});
	display.addEventListener('mouseup', e => {
		if (!e.target.htmlFor) return;
		const cell = document.getElementById(e.target.htmlFor);
		if (cellMouseDown === cell)
			cell.checked ^= 1;
		cellMouseDown = null;
	});
	display.addEventListener('mouseover', e => {
		if (!cellMouseDown || !e.target.htmlFor) return;
		document.getElementById(e.target.htmlFor).checked = isCellChecked;
		genNumber();
	});
	document.body.addEventListener('mouseup', () => {
		cellMouseDown = null;
	});

	drawDisplay();

	if (window.location.hash)
		parseHash(window.location.hash);
	else if (localStorage.settings)
		parseHash(localStorage.settings);
	if (window.location.host)
		history.pushState(undefined, undefined, '.');
};

function drawDisplay() {
	const display = document.getElementById('display');
	const frag = document.createDocumentFragment();
	size.x = parseInt(document.querySelector('.sizeX').value) || 1;
	size.y = !document.getElementById('square').checked
		? parseInt(document.querySelector('.sizeY').value) || 1
		: size.x;
	axis.x = document.getElementById('axisXL').checked ? -1 : 1;
	axis.y = document.getElementById('axisYU').checked ? -1 : 1;

	localStorage.settings = genSettings();
	scaleDisplay();
	while (display.childNodes.length)
		display.removeChild(display.lastChild);
	for (let i = 0, iLen = size.x * size.y; i < iLen; i++) {
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

function validate(e, regex) {
	const keyCodes = [8, 9, 13, 35, 36, 37, 38, 39, 40, 46, 116];
	if (keyCodes.includes(e.keyCode) || e.ctrlKey || e.altKey || e.metaKey || !regex.test(e.key))
		syncNumber(e.target);
	else
		e.preventDefault();
}

function add(num) {
	if (number + num < 0n) return;
	number += num;
	syncNumber();
}

function syncNumber(el) {
	const prefix = { '16': '0x', '10': '', '2': '0b' };
	if (el)
		number = BigInt(prefix[el.dataset.radix] + el.value);
	document.querySelectorAll('.number').forEach(field => {
		if (field === el) return;
		field.value = number.toString(parseInt(field.dataset.radix));
	});
	genDisplay();
}

function genDisplay() {
	let num = number;
	for (let i = 0, iLen = size.x * size.y; i < iLen; i++) {
		document.getElementById(i).checked = num % 2n;
		num >>= 1n;
	}
}

function genNumber() {
	let num = 0n;
	document.querySelectorAll('.cell').forEach(el => {
		num += !el.checked ? 0n : 2n ** BigInt(el.id);
	});
	number = num;
	syncNumber();
}

function invertDisplay() {
	document.querySelectorAll('.cell').forEach(el => {
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
	const numHash = encodeBase64(number);
	return genSettings() + (!numHash ? '' : '&' + numHash);
}

function parseHash(hash) {
	const sizeX = document.querySelector('.sizeX');
	const square = document.getElementById('square');
	let res = /(\d+)(?:\.(\d+))?(L|R)(U|D)(?:&([\w-]+))?/i.exec(hash);
	if (!res) return;
	sizeX.value = parseInt(res[1]) || size.x;
	if (parseInt(res[2])) {
		square.checked = false;
		document.querySelector('.sizeY').value = parseInt(res[2]);
	} else
		square.checked = true;
	document.getElementById('axisX' + res[3].toUpperCase()).checked = true;
	document.getElementById('axisY' + res[4].toUpperCase()).checked = true;
	if (res[5]) {
		number = decodeBase64(res[5]);
		syncNumber();
	}
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
	for (let i = 0; i < str.length; i++) {
		num <<= 6n;
		num += BigInt(base64.indexOf(str[i]));
	}
	return num;
}

function copyNum(el) {
	document.querySelector('.' + el.classList.item(1)).select();
	document.execCommand('copy');
	el.classList.add('copied');
	setTimeout(() => {
		el.classList.remove('copied');
	}, 1000);
}

function copyLink() {
	const copyText = document.querySelector('.copy-text');
	const link = document.querySelector('.link');
	copyText.value = window.location.href.split('#')[0] + '#' + genHash();
	copyText.select();
	document.execCommand('copy');
	copyText.blur();
	link.classList.add('copied');
	setTimeout(() => {
		link.classList.remove('copied');
	}, 1000);
}
