require("dotenv").config();
const express = require("express");
const app = express();
const url = require("url");
const fetch = require("node-fetch")
const mongoose = require("mongoose");
const socketio = require("socket.io");
const http = require("http");
const Auth = require("./models/auth");

const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.DATABASE_URL, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once("open", () => {
  console.log("Mongoose connected successfully");
})
db.on("error", (error) => {
  console.log(error);
})

io.on("connection", (socket) => {
  console.log("There was a connection");

  socket.on("get_info", async () => {
    const auth = await Auth.find({});
    const useAuth = auth[auth.length - 1];
    fetch("https://api.zoom.us/v2/users/me", {
      headers: {
        "Authorization": `Bearer ${useAuth.authToken}`
      }
    }).then(data => {
      data.json().then(data => {
        socket.emit("get_info", data);
      })
    });
  })

  socket.on("get_chat_channels", async () => {
    const chat_channel_url = "http://api.zoom.us/v2/";
    const new_url = url.format({
      pathname: chat_channel_url,
      query: {
        "page_size": 2
      }
    });
    const auth = await Auth.find({});
    const useAuth = auth[auth.length - 1];
    fetch(new_url, {
      headers: {
        "Authorization": `Bearer ${useAuth.authToken}`
      }
    }).then(data => {
      data.json().then(data => {
        socket.emit("get_chat_channels", data);
      })
    })
  })

  socket.on("create_chat_channel", async () => {
    const create_chat_channel_url = "http://api.zoom.us/v2/im/chat/messages";
    //76109695826
    const new_url = url.format({
      pathname: create_chat_channel_url,
    })
    const auth = await Auth.find({});
    const useAuth = auth[auth.length - 1];
    console.log(useAuth);
    fetch(new_url, {
      headers: {
        "Authorization": `Bearer ${useAuth.authToken}`
      },
      body: {
        "robot_jid": "v1pvkrrd-trs6arajv7v9hbq@xmpp.zoom.us",
        "to_jid": "https://us04web.zoom.us/j/76109695826?pwd=QXgrUytxajRBUUlJTDhOWVVyWWlrUT09",
        "account_id": "Utvu6dNsQVy9NcDPr0DnOA",
        "content": {
          "head": {
            "text": "Hello world"
          }
        }
      },
      method: "POST"
    }).then(data => {
      data.json().then(data => {
        console.log(data);
        socket.emit("create_chat_channel", data);
      })
    })
  })

})

app.get("/auth/refresh", async (req, res) => {
  const auth = await Auth.find({});
  const useAuth = auth[auth.length - 1];
  const zoom_token_url = "https://zoom.us/oauth/token"
  const new_url = url.format({
    pathname: zoom_token_url,
    query: {
      "grant_type": "refresh_token",
      "refresh_token": useAuth.refreshToken
    }
  });
  const header = Buffer.from(`${process.env.client_id}:${process.env.client_secret}`).toString("base64");
  fetch(new_url, {
    headers: {
      "Authorization": `Basic ${header}`
    },
    method: "POST"
  }).then(data => {
    data.json().then(async data => {
      const newAuth = new Auth({
        authToken: data.access_token,
        refreshToken: data.refresh_token
      });
      await newAuth.save();
      res.json({
        message: "The transaction completed successfully"
      })
    })
  })
})

app.get("/auth", (req, res) => {
  const zoom_auth_url = "https://zoom.us/oauth/authorize";
  const new_url = url.format({
    pathname: zoom_auth_url,
    query: {
      "response_type": "code",
      "redirect_uri": "http://localhost:5000/auth/cb",
      "client_id": process.env.client_id
    }
  })
  console.log(new_url);
  res.redirect(new_url);
});

app.get("/auth/cb", async (req, res) => {
  const zoom_token_url = "https://zoom.us/oauth/token";
  const new_url = url.format({
    pathname: zoom_token_url,
    query: {
      "grant_type": "authorization_code",
      "code": `${req.query.code}`,
      "redirect_uri": "http://localhost:5000/auth/cb"
    }
  });
  const header = Buffer.from(`${process.env.client_id}:${process.env.client_secret}`).toString("base64");
  fetch(new_url.toString(), {
    headers: {
      "Authorization": `Basic ${header}`
    },
    method: "POST"
  }).then(data => {
    data.json().then(async data => {
      console.log(data);
      try {
        const auth = new Auth({
          authToken: data.access_token,
          refreshToken: data.refresh_token
        });
        console.log(auth);
        await auth.save();
        res.json({
          message: "The transaction was completed"
        })
      } catch (err) {
        console.log(err);
      }
    })
  })
})

app.post("bot", (req, res) => {
  res.send("Hio");
})

app.get("bot", (req, res) => {
  res.send("Hio");
})


server.listen(PORT, () => {
  console.log(`The server is listening on port ${PORT}`);
})
