
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// ต้องตั้ง DEVICE_TOKEN ใน Render และใช้ค่าเดียวกันใน ESP32
const DEVICE_TOKEN =
  process.env.DEVICE_TOKEN || "smart-home-device-token";

let device = {
  online: false,
  led: false,
  lastSeen: 0
};

let pendingCommand = null;

const publicPath = path.join(__dirname, "public");

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}

function authorized(req) {
  return req.headers["x-device-token"] === DEVICE_TOKEN;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 10000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. ตรวจสอบสถานะ ESP32
  if (req.method === "GET" &&
      url.pathname === "/api/status") {

    device.online = Date.now() - device.lastSeen < 10000;

    return sendJSON(res, 200, {
      online: device.online,
      led: device.led
    });
  }

  // 2. เว็บไซต์ส่งคำสั่งเปิด-ปิด LED
  if (req.method === "POST" &&
      url.pathname === "/api/device/command") {

    device.online = Date.now() - device.lastSeen < 10000;

    if (!device.online) {
      return sendJSON(res, 503, {
        success: false,
        message: "ESP32 is offline"
      });
    }

    try {
      const body = await readBody(req);

      if (body.led !== "ON" && body.led !== "OFF") {
        return sendJSON(res, 400, {
          success: false,
          message: "Invalid command"
        });
      }

      pendingCommand = body.led;

      return sendJSON(res, 200, {
        success: true,
        message: "Command sent to queue"
      });

    } catch (error) {
      return sendJSON(res, 400, {
        success: false
      });
    }
  }

  // 3. ESP32 ขอรับคำสั่งจากเซิร์ฟเวอร์
  if (req.method === "GET" &&
      url.pathname === "/api/device/command/next") {

    if (!authorized(req)) {
      return sendJSON(res, 401, {
        error: "Unauthorized"
      });
    }

    const command = pendingCommand;
    pendingCommand = null;

    return sendJSON(res, 200, {
      command: command
    });
  }

  // 4. ESP32 ส่งสถานะกลับมา (Heartbeat)
  if (req.method === "POST" &&
      url.pathname === "/api/device/heartbeat") {

    if (!authorized(req)) {
      return sendJSON(res, 401, {
        error: "Unauthorized"
      });
    }

    try {
      const body = await readBody(req);

      device.lastSeen = Date.now();
      device.online = true;

      if (typeof body.led === "boolean") {
        device.led = body.led;
      }

      return sendJSON(res, 200, {
        success: true
      });

    } catch (error) {
      return sendJSON(res, 400, {
        success: false
      });
    }
  }

  // 5. แสดงหน้าเว็บไซต์
  if (req.method === "GET") {

    const requestedPath =
      url.pathname === "/"
        ? "index.html"
        : url.pathname.slice(1);

    const filePath = path.resolve(publicPath, requestedPath);

    if (!filePath.startsWith(publicPath + path.sep)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.readFile(filePath, (error, content) => {

      if (error) {
        res.writeHead(404);
        return res.end("File not found");
      }

      const ext = path.extname(filePath);

      const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css",
        ".js": "text/javascript"
      };

      res.writeHead(200, {
        "Content-Type":
          types[ext] || "application/octet-stream"
      });

      res.end(content);
    });

    return;
  }

  sendJSON(res, 404, {
    error: "Not found"
  });
});

// เริ่มต้นเซิร์ฟเวอร์
server.listen(PORT, "0.0.0.0", () => {
  console.log("Smart Home Server is running on port " + PORT);
});

