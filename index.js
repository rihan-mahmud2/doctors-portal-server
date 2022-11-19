const express = require("express");
const cors = require("cors");

require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(403).send({ message: "anauthorized acces" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vjq6aig.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const avilableServiceCollections = client
      .db("doctorsPortal")
      .collection("appointmentOptions");
    const bookingCollections = client
      .db("doctorsPortal")
      .collection("bookings");
    const userCollections = client.db("doctorsPortal").collection("users");
    const docorsCollections = client.db("doctorsPortal").collection("doctors");

    //make sure you use verifyAdmin after verifyJwt

    const verifyAdmin = (req, res, next) => {
      console.log("inside veryify admin", req.decoded.email);
    };

    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const avilableservices = await avilableServiceCollections
        .find(query)
        .toArray();
      const bookedQuery = { appointmentDate: date };
      const alreadyBooked = await bookingCollections
        .find(bookedQuery)
        .toArray();

      avilableservices.forEach((option) => {
        optionBooked = alreadyBooked.filter(
          (booked) => booked.treatment === option.name
        );
        bookSlots = optionBooked.map((option) => option.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });

      res.send(avilableservices);
    });

    app.get("/bookings", verifyJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        res.status(401).send({ message: "Unatuhorized access" });
      }

      const query = { email: email };
      const result = await bookingCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const query = {
        appointmentDate: booking.appointmentDate,
        treatment: booking.treatment,
        email: booking.email,
      };

      const alreadyBooked = await bookingCollections.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You have already booked on ${booking.appointmentDate}`;
        res.send({ acknowledged: false, message });
      }

      const result = await bookingCollections.insertOne(booking);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const user = await userCollections.findOne(query);

      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });

        return res.send({ accessToken: token });
      }

      // res.status(403).send({ message: "Aunauthorized user" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const result = await userCollections.insertOne(user);
      res.send(result);
    });

    app.put("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await userCollections.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await userCollections.find(query).toArray();
      res.send(users);
    });

    app.get("/appointmentSpecality", async (req, res) => {
      const query = {};
      const result = await avilableServiceCollections
        .find(query)
        .project({ name: 1 })
        .toArray();

      res.send(result);
    });

    app.get("/dashboard/doctors", verifyJwt, async (req, res) => {
      const query = {};
      const doctors = await docorsCollections.find(query).toArray();
      res.send(doctors);
    });

    app.post("/dashboard/doctors", verifyJwt, async (req, res) => {
      const doctors = req.body;
      const result = await docorsCollections.insertOne(doctors);
      res.send(result);
    });

    app.delete(
      "/dashboard/doctors/:id",
      verifyJwt,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await docorsCollections.deleteOne(query);
        res.send(result);
      }
    );
    /**
     *
     * api naming conventions
     *
     * app.get("/booking")
     * app.get("/booking/:id")
     * app.post("/booking")
     * app.patch("/booking/:id")
     * app.delete("/booking/:id")
     */
  } catch {}
}

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Doctors portal server is running");
});

app.listen(port, (req, res) => {
  console.log("The server is listening ");
});
