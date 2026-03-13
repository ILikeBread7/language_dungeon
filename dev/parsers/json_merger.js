import fs from 'node:fs'

const args = process.argv.slice(2);
const files = args;

const result = [];
const resultSet = new Set();
files.forEach(filename => {
    const json = JSON.parse(fs.readFileSync(filename, 'utf8'));
    json.forEach(entry => {
        if (resultSet.has(entry.question)) {
            return;
        }
        result.push(entry);
        resultSet.add(entry.question);
    });
});

console.log(JSON.stringify(result, null, 4));