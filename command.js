import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from 'process';

// In ES modules, use fileURLToPath and import.meta.url to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envFilePath = path.resolve(__dirname, '.env');

    try {
        const envFileContent = fs.readFileSync(envFilePath, { encoding: 'utf8' });

        envFileContent.split('\n').forEach((line) => {
            const cleanLine = line.trim();
            if (cleanLine && !cleanLine.startsWith('#')) {
                const [key, value] = cleanLine.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            }
        });
    } catch (error) {
        console.error(`Failed to load .env file: ${error.message}`);
    }
}

loadEnv();

const DEV_TIPS = true

var commands = JSON.parse(String(fs.readFileSync(env.COMMAND_JSON_PATH + env.COMMAND_JSON_FILE)))

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.write(`
>>> Command line <<<
Type "help please" for a list of commands and tips

`)

async function runTime() {
    const line = await new Promise((resolve, reject) => {
        rl.question(`> `, line => {
            resolve(line);
        })
    })
    return await parser(line, env.COMMAND_JSON_PATH, env.COMMAND_JSON_FILE)
}

async function parser(line, COMMAND_JSON_PATH, COMMAND_JSON_FILE) {
    console.log(">", line)
    if (line == "close") return false

    const args = line.split(" ")

    var i = 0
    var commands = JSON.parse(String(fs.readFileSync(COMMAND_JSON_PATH + COMMAND_JSON_FILE)))
    var fullPath = ""
    while (true) {
        const moduleObj = commands[args[i]]
        if (!moduleObj) {
            rl.write("Command not found\n")
            return true
        }
        fullPath += moduleObj.path

        if (moduleObj.function) {
            const module = await import(COMMAND_JSON_PATH + fullPath)
            await module[moduleObj.function]({ rl, line, commands, fullArgs: args, args: args.slice(i + 1), command: args.slice(0, i) })

            return true
        }
        else {
            commands = JSON.parse(String(fs.readFileSync(`${COMMAND_JSON_PATH}/${fullPath}/${COMMAND_JSON_FILE}`)))
            // console.error("Development Error: Function not found. Dynamic import not supported yet.")
            // const commandsJson = JSON.parse(String(fs.readFileSync(`${moduleObj.path}`)))
        }
        i++
    }
}

var continueRunTime = true

try {
    console.log("\n>> Start: start.json <<")

    var startCommands = JSON.parse(String(fs.readFileSync(env.START_JSON_PATH + env.START_JSON_FILE)))
    for (const i of startCommands) {
        continueRunTime = await parser(i, env.COMMAND_JSON_PATH, env.COMMAND_JSON_FILE)
        if (!continueRunTime) break
    }
    console.log(">> End: start.json <<\n")
} catch (e) {
    if (DEV_TIPS) console.log("start.json failed: ", e)
    else console.log("start.json failed")
}

try {
    if (continueRunTime) {
        async function main() {
            while (await runTime()) { }
            rl.close()
        }

        main()
    }
    else {
        rl.close()
    }
} catch (e) {
    if (DEV_TIPS) console.log("command.json failed: ", e)
    else console.log("command.json failed")
}
