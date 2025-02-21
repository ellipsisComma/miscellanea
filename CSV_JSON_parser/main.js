// run function to create module
const MakeCSVParser = () => {
	const invalidSpecialChars = [`\n`, `\r`, `]`, `\\`];
	/*
	exclude right square brackets because they interfere with escaping special chars in regex
	exclude backslashes because they're read as incomplete regex character classes

	if the parser allowed right square brackets as special chars,
	the code would have to be littered with some kind of escapeSpecialChar() function
	that would exist solely to return character === `]` ? `\]` : character

	this escaping couldn't happen in updateSpecialChar()
	because the special chars don't *always* need to be escaped like that
	so it'd have to be done on a case-by-case basis later in the code

	if you need to use a right square bracket or backslash as a separator or escaper:
	no you don't, use another character

	mea culpa
	*/
	const ch = {
		"separator": `,`,
		"escaper": `"`,
	};
	let includedColumns = [];

	let rowRegex;
	let fieldRegex;
	let escapeRegex;

	/*
	verbose regex in JS: use as template literal tag with first argument of a `new RegExp`.
	trims whitespace on each line and removes comments written with JS syntax.
	see `setRegexes` function for partial demo.
	*/
	function verbose(strings, ...subs) {
		return [strings.raw[0], subs.map((sub, i) => sub + strings.raw[i + 1]).join(``)].join(``)
			.replaceAll(/(?:^|\s)(?:\/\/.*|\/\*[\s\S]*?\*\/)/gm, ``)
			.replaceAll(/^\s+|\s+$|\n/gm, ``);
	}

	// check whether arg is a generic JS object
	function isObject(variable) {
		return variable instanceof Object && variable.constructor === Object;
	}

	// set either special character if it's valid
	function setSpecialChar(type, character) {
		if (ch[type] === character) return;
		if (typeof character !== `string` || character.length !== 1 || invalidSpecialChars.includes(character)) {
			console.error(`${type} must be a length-1 string, and must not be a newline, carriage return, right square bracket, or backslash`);
			return;
		}
		if (Object.values(ch).includes(character)) {
			console.error(`Special characters must be unique`);
			return;
		}
		ch[type] = character;
		setRegexes();
	}

	// set which columns should be included in output (in either direction)--empty array resets value to all columns
	function setIncludedColumns(headings) {
		if (!(headings instanceof Array)) {
			console.error(`Argument "headings" must be an array of headings`);
			return;
		}
		for (const heading of headings) {
			if (![`string`, `number`, `bigint`, `boolean`, `symbol`].includes(typeof heading) || heading === null) {
				console.error(`All items in argument "headings" must be strings, numbers, bigints, booleans, symbols, or nulls`);
				return;
			}
		}
		includedColumns = headings;
	}

	// update regexes for parsing CSV according to initial/new special characters
	function setRegexes() {
		const unescapedField = String.raw`[^${ch.escaper}${ch.separator}\n]*`;
		const escapedField = String.raw`(?:[^${ch.escaper}]|${`[${ch.escaper}]`.repeat(2)})*`;
		rowRegex = new RegExp(verbose`
		^(?:
			${unescapedField}
			|
			[${ch.escaper}]${escapedField}[${ch.escaper}]
			|
			[${ch.separator}]
		)*$
		`, `gm`);
		fieldRegex = new RegExp(verbose`
		(?<=
			^|[${ch.separator}]
		)
		(?:
			(?<unescaped>${unescapedField})
			|
			[${ch.escaper}](?<escaped>${escapedField})[${ch.escaper}]
		)
		(?=
			$|[${ch.separator}]
		)
		`, `gm`);
		/*
			could remove the lookarounds in fieldRegex and just add `ch.separator` at the end,
			then append `ch.separator` to the row string when matching it against fieldRegex,
			but if you mistakenly don't append with `ch.separator`,
			then you'll lose the last column of each row

			(?:
				(?<unescaped>${unescapedField})
				|
				[${ch.escaper}](?<escaped>${escapedField})[${ch.escaper}]
			)
			[${ch.separator}]
		*/
		escapeRegex = new RegExp(String.raw`[\n${ch.separator}${ch.escaper}]`);
	}

	// escape a CSV field using escaper special character
	function escapeField(field) {
		return escapeRegex.test(field)
			? `${ch.escaper}${field.toString().replaceAll(ch.escaper, ch.escaper.repeat(2))}${ch.escaper}`
			: field.toString();
	}

	// add new row to top of CSV
	function addHeadings(csv, headings, string = false) {
		if (!(headings instanceof Array)) {
			console.error(`Argument "headings" must be an array of headings`);
			return;
		}
		return `${headings.map(heading => escapeField(heading)).join(ch.separator)}\n${csv}`;
	}

	// replace top row of CSV
	function replaceHeadings(csv, headings) {
		let escaped = false;
		let cut = 0;

		for (let i = 0; i < csv.length; i++) {
			if (csv[i] === ch.escaper) escaped = !escaped;
			if (!escaped && (csv[i] === `\n` || i === csv.length - 1)) {
				cut = i;
				break;
			}
		}

		return addHeadings(csv.slice(cut + 1), headings);
	}

	// check that JS object input is an array of objects that all have the included columns (if set) or the keys from the first object (otherwise)
	function validateJSON(json) {
		let valid = false;

		if (!(json instanceof Array)) {
			console.error(`Input is not array.`);
			return false;
		}

		const headings = getJSONheadings(json);
		const nonObjectIndices = [];
		const incompleteHeadings = [];

		json.forEach((row, i) => {
			if (!isObject(row)) nonObjectIndices.push(i);
			else for (const heading of headings) if (!(heading in row)) incompleteHeadings.push(i);
		});

		if (nonObjectIndices.length > 0) {
			console.error(`Item at index [${nonObjectIndices.join(`, `)}] is not row object.`);
		}
		if (incompleteHeadings.length > 0) {
			console.error(`Item at index [${incompleteHeadings.join(`, `)}] is missing at least one presumed heading (from headings [${headings.join(`, `)}])`);
		}

		return nonObjectIndices.length === 0 && incompleteHeadings.length === 0;
	}

	// parse single row of CSV to a JS object
	function CSVtoJSONrow(row) {
		return [...row.matchAll(fieldRegex)]
		// get the unescaped field (if exists), else the escaped field with escaped escapes cut down
		.map(field => field.groups.unescaped ?? field.groups.escaped.replaceAll(ch.escaper.repeat(2), ch.escaper));
	}

	// parse a JS array to a row of CSV (included for completeness)
	function JSONtoCSVrow(row) {
		if (!isObject(row)) {
			console.error(`Input is not generic object.`);
			return false;
		}
		return Object.values(row).map(JSONvalueToField).join(ch.separator);
	}

	// split CSV string into an array of strings, one per row
	function parseCSVToRows(csv) {
		return [...csv.matchAll(rowRegex)].flat();
	}

	// get headings from JS object (or return included columns)
	function getJSONheadings(json) {
		return includedColumns.length > 0 ? includedColumns
		: json.length > 0 && isObject(json[0]) ? Object.keys(json[0])
		: [];
	}

	// parse JS property value to CSV field if it exists, else return empty string
	function JSONvalueToField(value) {
		return typeof value !== `undefined` && value !== null ? escapeField(value) : ``;
	}

	// top-level parser function: parse a CSV string representing an entire table into a JS array of objects
	function CSVtoJSONtable(csv) {
		if (typeof csv !== `string`) {
			console.error(`Input to .tableToJSON() must be string, not ${typeof csv}`);
			return;
		}

		// get array of arrays (rows of fields)
		const rows = parseCSVToRows(csv).map(CSVtoJSONrow);
		const headings = rows.shift()
		const usedHeadings = includedColumns.length > 0 ? includedColumns.map(String) : headings; // must m

		// build an object version of each row using headings and row data
		const output = [];
		for (const row of rows) {
			const jsonRow = {};
			for (let h = 0; h < headings.length; h++) {
				if (!usedHeadings.includes(headings[h])) continue;
				jsonRow[headings[h]] = row[h] ?? ``;
			}
			output.push(jsonRow);
		}

		return output;
	}

	// top-level parser function: parse an array of objects into a CSV string representing an entire table
	function JSONtoCSVtable(json) {
		if (!validateJSON(json)) return;

		const headings = getJSONheadings(json);

		const output = [];

		output.push(headings.map(escapeField).join(ch.separator));

		json.forEach(row => output.push(
			headings.map(heading => JSONvalueToField(row[heading])).join(ch.separator)
		));

		return output.join(`\n`);
	}

	// initialise
	setRegexes();

	return {
		"tableToJSON": (...args) => CSVtoJSONtable(...args),
		"tableFromJSON": (...args) => JSONtoCSVtable(...args),
		"rowToJSON": (...args) => CSVtoJSONrow(...args),
		"rowFromJSON": (...args) => JSONtoCSVrow(...args),
		"getSeparator": () => ch.separator,
		"setSeparator": (...args) => setSpecialChar(`separator`, ...args),
		"getEscaper": () => ch.escaper,
		"setEscaper": (...args) => setSpecialChar(`escaper`, ...args),
		"getIncludedColumns": () => includedColumns,
		"setIncludedColumns": (...args) => setIncludedColumns(...args),
		"addHeadings": (...args) => addHeadings(...args),
		"replaceHeadings": (...args) => replaceHeadings(...args),
	};
};
