# CSV-JSON parser

## Implementation

This parser follows the [RCF-4180](https://www.ietf.org/rfc/rfc4180.txt) standard for CSV/Comma-Separated Values, generally:

* the data table is a text file
* records are separated by newlines
* the final record may end with a newline or the end of the file
* fields within a record are separated by commas
* fields can be &ldquo;escaped&rdquo; by wrapping the field in doublequotes
* escaped fields can contain commas or newlines as character data, not to separate fields or records
* escaped fields can contain doublequotes if the doublequote is prefixed with another doublequote
* any field can be wrapped in doublequotes, even if it has no special characters to escape
* the fields of the first row may be headings for the fields of each subsequent row

The parser also allows two of the special characters, the field-separator and the escape character, to be changed to almost any other character.

## Use

Create a new instance using the function `MakeCSVParser`:

```js
const parser = MakeCSVParser();
```

## Methods

The parser includes the following methods:

* `tableToJSON(string)`
* `tableFromJSON(array of objects)`
* `rowToFields(string)`
* `getSeparator()`
* `getEscaper()`
* `setSeparator(string)`
* `setEscaper(string)`
* `setIncludedColumns(array of strings, numbers, bigints, booleans, symbols, or nulls)`
* `getIncludedColumns()`
* `addHeadings(array of strings)`
* `replaceHeadings(array of strings)`

### Table-parsing methods (`tableToJSON`, `tableFromJSON`)

`tableToJSON` takes one argument (a string) and returns an array of 0 or more objects. The method parses a CSV string to an array of objects, one object per row. It uses the first row of CSV as headings, which become the keys of each object.

Example:

```js
const csv = `title,year
Seven Samurai,1954
High and Low,1963
Ran,1985`;

const json = parser.tableToJSON(csv);

console.log(json);
```

Log:

```
[
	{
		"title": "Seven Samurai",
		"year": "1954"
	},
	{
		"title": "High and Low",
		"year": "1963"
	},
	{
		"title": "Ran",
		"year": "1985"
	}
]
```

`tableFromJSON` takes one argument (an array of objects) and returns a string. The method parses the array to a CSV string, one row per object. It uses the keys of the first object in the array as a header row in the CSV.

For example:

```js
const json = [
	{
		"title": `Seven Samurai`,
		"year": `1954`,
	},
	{
		"title": `High and Low`,
		"year": `1963`,
	},
	{
		"title": `Ran`,
		"year": `1985`,
	},
];

const csv = parser.tableFromJSON(json);

console.log(csv);
```

Log:

```
title,year
Seven Samurai,1954
High and Low,1963
Ran,1985
```

### Row-parsing methods (`rowToJSON`, `rowFromJSON`)

`rowToJSON` takes one argument (a string) and returns an array of strings. The method parses a single row of CSV into an array of strings in which each item is one field from the CSV row.

For example:

```js
const csv = `title,year`;

const arr = parser.rowToJSON(csv);

console.log(arr);
```

Log:

```
["title", "year"]
```

`rowFromJSON` takes one argument (an array) and returns a string. The method parses the array to a single row of CSV string.

For example:

```js
const arr = [`High and Low`, 1963];

const csv = parser.rowFromJSON(arr);

console.log(csv);
```

Log:

```
High and Low,1963
```

### Special character methods (`getSeparator`, `getEscaper`, `setSeparator`, `setEscaper`)

`getSeparator` and `getEscaper` take no arguments and each returns a single-character string containing the current CSV separator or escaper respectively. The default separator is a comma (`,`) and the default escaper is an ASCII doublequote (`"`).

`setSeparator` and `setEscaper` take one argument each (a string) and returns `undefined`. This string must be a single unique character (not the same as the other special character) and may not be a newline (`\n`), carriage return (`\r`), right square bracket (`]`), or backslash (`\\`). This character will be used when parsing to or from CSV.

For example:

```js
const parser = MakeCSVParser();

console.log(parser.getSeparator());
console.log(parser.getEscaper());

parser.setSeparator(`:`);
parser.setEscaper(`|`);

console.log(parser.getSeparator());
console.log(parser.getEscaper());
```

Log:

```
,

"

:

|
```

### Output restriction methods (`setIncludedColumns`, `getIncludedColumns`)

The "included columns" are the column names (i.e. CSV headings or object keys) that will be included in the output of the `tableToJSON` and `tableFromJSON` methods.

`getIncludedColumns` takes no arguments and returns an array of the current included columns. The default included columns are an empty array (`[]`). If the array is empty, all columns are included.

`setIncludedColumns` takes one argument (an array of valid JavaScript object keys of one or mixed type) and returns `undefined`. The included columns can be reset, so all columns in the input data will be transferred to the output, by using this method with an empty array.

For example:

```js
console.log(parser.getIncludedColumns());

const csv = `title,year
Seven Samurai,1954
High and Low,1963
Ran,1985`;

parser.setIncludedColumns([`title`]);

console.log(parser.getIncludedColumns());

const json = parser.tableToJSON(csv);

console.log(json);
```

Log:

```
[]

[`title`]

[
	{
		"title": "Seven Samurai"
	},
	{
		"title": "High and Low"
	},
	{
		"title": "Ran"
	}
]
```

**Note:** Keys in JSON, as opposed to JavaScript objects, *must* be strings wrapped in ASCII doublequotes.

### CSV heading modifier methods (`addHeadings`, `replaceHeadings`)

`addHeadings` takes two arguments (a string and an array) and returns a string. The method converts an array of headings to CSV and prepends it to an existing CSV string. This method should be used if the original CSV data doesn't include headings.

For example:

```js
const csv = `Seven Samurai,1954
High and Low,1963
Ran,1985`;

const csv_i = parser.addHeadings(csv, [`title`, `year`]);

console.log(csv_i);
```

Log:

```
title,year
Seven Samurai,1954
High and Low,1963
Ran,1985
```

`replaceHeadings` takes two arguments (a string and an array of strings) and returns a string. The method removes the first row of a CSV string, the converts an array of headings to CSV and prepends it to the existing CSV string. This method can be used to replace existing CSV headings with values that are easier to use in JavaScript.

For example:

```js
const csv = `film title,release year
Seven Samurai,1954
High and Low,1963
Ran,1985`;

const csv_i = parser.replaceHeadings(csv, [`filmTitle`, `releaseYear`]);

console.log(csv_i);
```

Log:

```
filmTitle,releaseYear
Seven Samurai,1954
High and Low,1963
Ran,1985
```

## Data types

All CSV data is converted to strings in the resultant object or array. Further processing is left to your discretion. All fields of an input object are necessarily converted to strings in the resultant CSV, as CSV has no data types.

Object properties whose value is `null` or `undefined` (`undefined` being invalid in JSON, but valid in a JavaScript object) are converted to empty strings in the resultant CSV. Each row-object must have entries for all headings (either all of the included column headings, or, if none are set, all of the keys of the first row-object).
