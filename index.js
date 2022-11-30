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
      date: String,
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

app.post("/api/users/:_id/exercises", (req, res) => {
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  const date = req.body.date ? "Mon Jan 01 1990" : "Tue Nov 29 2022";
  const userId = req.params._id;

  // if (!date) {
  //   date = new Date();
  // } else {
  //   date = new Date(date);
  // }
  const exercise = {
    date,
    duration,
    description,
  };
  Username.findByIdAndUpdate(
    userId,
    { $push: { log: exercise }, $inc: {count: 1} },
    { new: true },
    (err, user) => {
      if (user) {
        const updatedExercise = {
          _id: userId,
          username: user.username,
          ...exercise,
        };
        res.json(updatedExercise);
      }
      if(err) {
        res.status(404).json({
          message: err.message,
          data: undefined,
          error: true
        })
      }
    }
  );
});

// logs routes

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit} = req.query
    const foundedUser = await Username.findById(req.params._id)
    // if(!foundedUser) {
    //   return res.status(404).json({
    //     message: "This ID doesn't exist",
    //     data: undefined,
    //     error: true
    //   })
    // }
    if(from || to || limit) {
      const fromDate = new Date(from) == "Invalid Date" ? undefined : new Date(from)
      const toDate = new Date(to) == "Invalid Date" ? undefined : new Date(to)
      if(fromDate && toDate) {
        const logFiltered = foundedUser.log.filter(log => (new Date(log.date) > fromDate && new Date(log.date) < toDate)).slice(0, Number(limit) ? limit : undefined)
        console.log('1',req.params._id ,from, to, limit, logFiltered)
        return res.json({
          _id: foundedUser._id,
          username: foundedUser.username,
          from: fromDate.toDateString(),
          to: toDate.toDateString(),
          count: logFiltered.length,
          log: logFiltered == [] ? "undefined" : 'logFiltered'
        })
      }
      if(fromDate) {
        console.log('2')
        const logFiltered = foundedUser.log.filter(log => (new Date(log.date) > fromDate)).slice(0, Number(limit) ? limit : undefined)
        console.log('2', logFiltered)
        return res.json({
          _id: foundedUser._id,
          username: foundedUser.username,
          from: fromDate.toDateString(),
          count: logFiltered.length,
          log: logFiltered
        })
      }
      if(toDate) {
        console.log('3')
        const logFiltered = foundedUser.log.filter(log => (new Date(log.date) < toDate)).slice(0, Number(limit) ? limit : undefined)
        console.log('3', logFiltered)
        return res.json({
          _id: foundedUser._id,
          username: foundedUser.username,
          to: toDate.toDateString(),
          count: logFiltered.length,
          log: logFiltered
        })
      }
      if(limit) {
        console.log('5')
        const logFiltered = foundedUser.log.slice(0, Number(limit) ? limit : undefined)
        return res.json({
          _id: foundedUser._id,
          username: foundedUser.username,
          count: logFiltered.length,
          log: logFiltered
        })
      }
    } else {
      console.log('4', foundedUser)
      return res.json(foundedUser)
    }
  } catch(err) {
    console.log(err)
    // return res.status(500).json({
    //   message: err.message,
    //   data: undefined,
    //   error: true
    // })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
