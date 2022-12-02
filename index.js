const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  log: [
    {
      _id: false,
      date: {type: String, required: false},
      duration: Number,
      description: String
    }
  ],
  count: Number,
});
const Username = mongoose.model("Username", userSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// users routes

app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await Username.find({}, {username: 1, _id: 1});
    return res.json(allUsers);
  } catch (err) {
    return res.status(500).json({
      message: err.message,
      data: undefined,
      error: true,
    });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    if (req.body.username == "") {
      return res.status(400).json({
        message: "Username can't be empty",
        data: undefined,
        error: true,
      });
    }
    const newUser = new Username({ username: req.body.username, count: 0 });
    const newUserSaved = await newUser.save();
    return res.json({
      _id: newUserSaved._id,
      username: newUserSaved.username
    });
  } catch (err) {
    return res.status(400).json({
      message: "This username already exist",
      data: undefined,
      error: true,
    });
  }
});

// exercises routes

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const description = req.body.description;
    const duration = parseInt(req.body.duration);
    let date = req.body.date
    const userId = req.params._id;
    console.log(userId, description, duration, date)

    if (!date) {
      date = new Date().toDateString();
    } else {
      date = new Date(date).toDateString();
    }

    const exercise = {
      date,
      duration,
      description,
    };
    await Username.findByIdAndUpdate(userId, { $push: {log: exercise }, $inc: {count: 1}}, { new: true })
    const userUpdated = await Username.findById(userId)
    res.json({
      username: userUpdated.username,
      date: exercise.date,
      duration: exercise.duration,
      description: exercise.description,
      _id: userId
    })
  } catch(err) {
    return res.status(400).json({
      message: err.message,
      data: undefined,
      error: true,
    });
  }
});

// logs routes

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit} = req.query
    const foundedUser = await Username.findById(req.params._id)
    if(!foundedUser) {
      return res.status(404).json({
        message: "This ID doesn't exist",
        data: undefined,
        error: true
      })
    }
    if(from || to || limit) {
      const fromDate = new Date(from) == "Invalid Date" ? undefined : new Date(from)
      const toDate = new Date(to) == "Invalid Date" ? undefined : new Date(to)
      if(fromDate && toDate) {
        const logFiltered = foundedUser.log.filter(log => (new Date(log.date) > fromDate && new Date(log.date) < toDate)).slice(0, Number(limit) ? limit : undefined)
        logFiltered.forEach(x => {
          x.date = new Date(x.date).toDateString()
        })
        return res.json({
          _id: foundedUser._id.toString(),
          username: foundedUser.username,
          from: fromDate.toDateString(),
          to: toDate.toDateString(),
          count: logFiltered.length,
          log: logFiltered
        })
      }
      if(fromDate) {
        const logFiltered = foundedUser.log.filter(log => (new Date(log.date) > fromDate)).slice(0, Number(limit) ? limit : undefined)
        logFiltered.forEach(x => {
          x.date = new Date(x.date).toDateString()
        })
        return res.json({
          _id: foundedUser._id.toString(),
          username: foundedUser.username,
          from: fromDate.toDateString(),
          count: logFiltered.length,
          log: logFiltered
        })
      }
      if(toDate) {
        const logFiltered = foundedUser.log.filter(log => (new Date(log.date) < toDate)).slice(0, Number(limit) ? limit : undefined)
        logFiltered.forEach(x => {
          x.date = new Date(x.date).toDateString()
        })
        return res.json({
          _id: foundedUser._id.toString(),
          username: foundedUser.username,
          to: toDate.toDateString(),
          count: logFiltered.length,
          log: logFiltered
        })
      }
      if(limit) {
        const logFiltered = foundedUser.log.slice(0, Number(limit) ? limit : undefined)
        logFiltered.forEach(x => {
          x.date = new Date(x.date).toDateString()
        })
        return res.json({
          _id: foundedUser._id.toString(),
          username: foundedUser.username,
          count: logFiltered.length,
          log: logFiltered
        })
      }
    } else {
      foundedUser.log.forEach(x => {
        x.date = new Date(x.date).toDateString()
      })
      return res.json({
        _id: foundedUser._id.toString(),
        username: foundedUser.username,
        count: foundedUser.log.length,
        log: foundedUser.log
      })
    }
  } catch(err) {
    return res.status(500).json({
      message: err.message,
      data: undefined,
      error: true
    })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
