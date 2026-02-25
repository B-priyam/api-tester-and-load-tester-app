import express from "express";
import cors from "cors";
import fs from "fs";
import path, { dirname } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

const PORT = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.get("/", (req, res) => {
  res.send({
    Page: "working",
  });
});

app.post("/run-test", upload.any(), async (req, res) => {
  try {
    const raw = req.body || {};
    const files = (req.files as any[]) || [];

    const url = raw.url;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const method = (raw.method || "GET").toUpperCase();
    const vus = Math.min(parseInt(raw.vus) || 1, 500);
    const duration = raw.duration || "30s";

    // -----------------------------
    // Parse headers safely
    // -----------------------------
    let parsedHeaders = {};
    if (raw.headers) {
      try {
        parsedHeaders =
          typeof raw.headers === "string"
            ? JSON.parse(raw.headers)
            : raw.headers;
      } catch {
        parsedHeaders = {};
      }
    }

    // -----------------------------
    // Parse JSON body safely
    // -----------------------------
    let parsedBody = {};
    if (raw.body) {
      try {
        parsedBody =
          typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
      } catch {
        console.log("in catch");
        parsedBody = {};
      }
    } else {
      parsedBody = raw;
    }

    // -----------------------------
    // Remove control fields
    // -----------------------------
    const controlFields = [
      "url",
      "method",
      "vus",
      "duration",
      "headers",
      "body",
    ];

    const payloadFields = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !controlFields.includes(key)),
    );

    Object.assign(payloadFields, parsedBody);

    const hasFiles = files.length > 0;

    // -----------------------------
    // Build file section
    // -----------------------------
    let fileInitSection = "";
    let filePayloadEntries: any[] = [];

    if (hasFiles) {
      files.forEach((file, index) => {
        const safePath = file.path.replace(/\\/g, "\\\\");
        fileInitSection += `const file_${index} = open("${safePath}", "b");\n`;

        filePayloadEntries.push(
          `${file.fieldname}: http.file(file_${index}, "${file.originalname}")`,
        );
      });
    }

    // -----------------------------
    // Headers handling
    // -----------------------------
    let finalHeaders = { ...parsedHeaders } as any;

    if (!hasFiles && method !== "GET") {
      finalHeaders["Content-Type"] = "application/json";
    }

    // -----------------------------
    // Build payload
    // -----------------------------
    let payloadSection = "";

    if (hasFiles) {
      payloadSection = `
  const payload = {
    ${filePayloadEntries.join(",\n")}
    ${Object.entries(payloadFields)
      .map(([k, v]) => `,\n    ${k}: "${v}"`)
      .join("")}
  };
  `;
    } else {
      payloadSection = `
  const payload = ${
    method === "GET"
      ? "null"
      : `JSON.stringify(${JSON.stringify(payloadFields, null, 2)})`
  };
  `;
    }

    console.log(payloadSection);

    // -----------------------------
    // Create unique test files
    // -----------------------------
    const testId = Date.now();
    const scriptPath = path.join(__dirname, `test-${testId}.js`);
    const resultPath = path.join(__dirname, `result-${testId}.json`);

    // -----------------------------
    // Generate k6 script
    // -----------------------------
    const scriptContent = `
import http from "k6/http";
import { check } from "k6";

${fileInitSection}

export const options = {
  vus: ${vus},
  duration: "${duration}",
};

export default function () {

  const params = {
    headers: ${JSON.stringify(finalHeaders, null, 2)},
  };

  ${payloadSection}

  const res = http.request(
    "${method}",
    "${url}",
    payload,
    params
  );

  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
  });
}
`;

    fs.writeFileSync(scriptPath, scriptContent);

    // -----------------------------
    // Run k6
    // -----------------------------
    const k6 = spawn("C:\\Program Files\\k6\\k6.exe", [
      "run",
      "--summary-export",
      resultPath,
      scriptPath,
    ]);

    let output = "";

    k6.stdout.on("data", (data) => {
      output += data.toString();
    });

    k6.stderr.on("data", (data) => {
      output += data.toString();
    });

    k6.on("close", (code) => {
      let summary = null;

      try {
        if (fs.existsSync(resultPath)) {
          summary = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
        }
      } catch {}

      // Cleanup
      try {
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath);
        files.forEach((f) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      } catch {}

      return res.json({
        message: "Test completed",
        exitCode: code,
        summary,
        consoleOutput: output,
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post(
  "/test",
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      upload.any()(req, res, next);
    } else {
      next();
    }
  },
  (req, res) => {
    const files = req.files as any[];
    files?.map((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    setTimeout(() => {
      console.log("QUERY:", req.query);
      console.log("BODY:", req.body);
      // console.log("FILES:", req.files);
      return res.json({
        query: req.query,
        body: req.body,
        files: req.files || [],
      });
    }, 500);
  },
);

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
