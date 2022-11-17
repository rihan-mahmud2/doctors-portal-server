const express = require("express");
const cors = require("cors");
const { json } = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
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

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const result = await bookingCollections.find(query).toArray();
      res.send(result);
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

    app.post("/users", async (req, res) => {
      const user = req.body;
    });

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
