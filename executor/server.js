const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());

app.post('/execute', async (req, res) => {
    const { language, code } = req.body;
    const runId = crypto.randomBytes(8).toString('hex');
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    let command = '';
    let filePath = '';

    try {
        if (language === 'javascript') {
            filePath = path.join(tempDir, `${runId}.js`);
            await fs.writeFile(filePath, code);
            command = `node ${filePath}`;
        }
        else if (language === 'python') {
            filePath = path.join(tempDir, `${runId}.py`);
            await fs.writeFile(filePath, code);
            command = `python3 ${filePath}`;
        } 
        else if (language === 'c') {
            filePath = path.join(tempDir, `${runId}.c`);
            const outPath = path.join(tempDir, `${runId}.out`);
            await fs.writeFile(filePath, code);
            command = `gcc ${filePath} -o ${outPath} && ${outPath}`;
        }
        else if (language === 'cpp') {
            filePath = path.join(tempDir, `${runId}.cpp`);
            const outPath = path.join(tempDir, `${runId}.out`);
            await fs.writeFile(filePath, code);
            command = `g++ ${filePath} -o ${outPath} && ${outPath}`;
        }
        else if (language === 'java') {
            filePath = path.join(tempDir, `Main_${runId}.java`);
            // Force the public class name to match the file name
            const javaCode = code.replace(/public\s+class\s+\w+/g, `public class Main_${runId}`);
            await fs.writeFile(filePath, javaCode);
            command = `javac ${filePath} && java -cp ${tempDir} Main_${runId}`;
        } 
        else {
            return res.status(400).json({ error: "Unsupported language" });
        }

        // Execute with a 3-second timeout to protect the free Render instance
        exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
            // Send response
            if (error) {
                if (error.killed) {
                    return res.json({ status: "error", output: "Timeout: Code took too long to run." });
                }
                return res.json({ status: "error", output: stderr || error.message });
            }
            res.json({ status: "success", output: stdout });
        });

    } catch (err) {
        res.status(500).json({ error: "Server error during file writing" });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Render provides the PORT dynamically, default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Executor running on port ${PORT}`));
