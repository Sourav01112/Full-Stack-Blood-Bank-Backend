const express = require("express");
const usersRouter = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { authMiddleware } = require("../middleware/auth.middleware");
const UserModel = require("../model/user.model");
const InventoryModel = require("../model/inventory.model");
const mongoose = require("mongoose");

require("dotenv").config();


// register]
usersRouter.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userExists = await UserModel.findOne({ email });
    // console.log(userExists, '@user');
    if (userExists) {
      return res.send({
        success: false,
        message:
          "User already exists in the database. Try with fresh credentials",
      });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);
    const newUser = new UserModel({ ...req.body, password: hashedPass });
    await newUser.save();
    res.status(200).send({
      success: true,
      message: "user has been registered successfully",
    });
  } catch (err) {
    return res.status(400).send({
      success: false,
      message: err.message,
    });
  }
});

// login
usersRouter.post("/login", async (req, res) => {
  console.log("inside login", req.body)
  try {
    const { email, password } = req.body;
    const userExists = await UserModel.findOne({ email })
    // .select('password')
    console.log(userExists, "@user");

    // user exits already ?
    if (!userExists || userExists == null) {
      console.log("here-->")

      return res
        .status(401)
        .send({ status: 401, success: false, message: "Invalid username or password" });
    }
    // userType is matching
    if (userExists.userType !== req.body.userType) {
      return res.send({
        success: false,
        status: 203,
        message: `User is not registered as ${req.body.userType}`,
      });
    }

    // comparing

    const validPassword = await bcrypt.compare(password, userExists.password);
    if (!validPassword) {
      return (
        res
          // .status(401)
          .send({ status: 404, success: false, message: "Wrong Password Entered" })
      );
    }

    // Generating Token
    const accessToken = jwt.sign(
      {
        // _id: encrypting userID
        userID: userExists._id,
      },
      // secret key
      process.env.JWTSecret,
      {
        expiresIn: "1d",
      }
    );

    const user = { ...userExists.toObject() };
    // console.log("user>>", user)
    delete user.password;

    res.status(200).send({
      success: true,
      message: "User logged in successfully",
      user: user,
      token: accessToken,
    });
    // console.log("@@", user, token);
  } catch (err) {
    console.log("err.message", err);
    return res.status(400).send({
      success: false,
      message: err.message,
    });
  }
});

// Get Current User According to UserType
usersRouter.get("/get-current-user", authMiddleware, async (req, res) => {
  // console.log("inside---->, /get-current-user", req.body)

  try {
    const isUser = await UserModel.findOne({ _id: req.body.userID });
    const user = { ...isUser.toObject() };
    // console.log("user>>", user)
    delete user.password;
    if (isUser) {
      res.status(200).json({
        success: true,
        message: "User fetched successfully",
        data: user,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    console.log("error in get-current-user", error)
    return res.json({
      success: false,
      message: error.message,
    });
  }
});

// Get All Unique Donor from the organization
usersRouter.post('/get-all-donors', authMiddleware, async (req, res) => {
  const page = parseInt(req.body.page, 10)
  const limit = parseInt(req.body.limit, 10)
  const skip = (page - 1) * limit

  const options = {
    page,
    limit,
    collation: {
      locale: 'en',
      strength: 2,
    },
    sort: { createdAt: -1 }

  };
  console.log("options", options)
  try {
    // Get all unique donors ids from Inventory if it matches the Org. then show unique donors
    const organization = new mongoose.Types.ObjectId(req.body.userID);

    const aggregationPipelineResult = await InventoryModel.aggregate([
      {
        $match: {
          inventoryType: 'Donation-In',
          organization,
        },
      },
      {
        $group: {
          _id: "$donor",
        },
      },
    ]).exec();
    const populateKeyword = 'users'

    const aggregationResult = await performPopulateAfterAggregationPipeline(aggregationPipelineResult, populateKeyword)
    const response = formAggregateResponse(aggregationResult, options)

    return res.json({
      success: true,
      message: "Donors Data Fetched Successfully",
      data: response,
    })
  } catch (error) {

    console.log("error", error)
    return res.json({
      success: false,
      message: error.message,
    });
  }
})

// Get All Unique Hospitals from the organization
usersRouter.post('/get-all-hospitals', authMiddleware, async (req, res) => {
  const page = parseInt(req.body.page, 10)
  const limit = parseInt(req.body.limit, 10)
  const skip = (page - 1) * limit

  const options = {
    page,
    limit,
    collation: {
      locale: 'en',
      strength: 2,
    },
    sort: { createdAt: -1 }
  };
  try {
    // Get all unique donors ids from Inventory if it matches the Org. then show unique donors
    const organization = new mongoose.Types.ObjectId(req.body.userID);

    const aggregationPipelineResult = await InventoryModel.aggregate([
      {
        $match: {
          inventoryType: 'Donation-Out',
          organization,
        },
      },
      {
        $group: {
          _id: "$hospital",
        },
      },
    ]).exec();
    const populateKeyword = 'users'

    const aggregationResult = await performPopulateAfterAggregationPipeline(aggregationPipelineResult, populateKeyword)
    const response = formAggregateResponse(aggregationResult, options)

    return res.json({
      success: true,
      message: "Donors Data Fetched Successfully",
      data: response,
    })
  } catch (error) {

    console.log("error", error)
    return res.json({
      success: false,
      message: error.message,
    });
  }
})


// Get All Unique Organizations for Donor View

usersRouter.post('/get-all-org-for-donor', authMiddleware, async (req, res) => {
  const page = parseInt(req.body.page, 10)
  const limit = parseInt(req.body.limit, 10)
  const skip = (page - 1) * limit

  const options = {
    page,
    limit,
    collation: {
      locale: 'en',
      strength: 2,
    },
    sort: { createdAt: -1 }

  };
  console.log("options", options)


  // return 
  try {
    // Get all unique donors ids from Inventory if it matches the Org. then show unique donors
    const donor = new mongoose.Types.ObjectId(req.body.userID);

    const aggregationPipelineResult = await InventoryModel.aggregate([
      {
        $match: {
          inventoryType: 'Donation-In',
          donor,
        },
      },
      {
        $group: {
          _id: "$organization",
        },
      },
    ]).exec();
    const populateKeyword = 'users'

    const aggregationResult = await performPopulateAfterAggregationPipeline(aggregationPipelineResult, populateKeyword)
    const response = formAggregateResponse(aggregationResult, options)

    return res.json({
      success: true,
      message: "Donors Data Fetched Successfully",
      data: response,
    })
  } catch (error) {

    console.log("error", error)
    return res.json({
      success: false,
      message: error.message,
    });
  }
})



const performPopulateAfterAggregationPipeline = async (aggregationPipelineResult, populateKeyword) => {
  return await InventoryModel.populate(aggregationPipelineResult, {
    path: '_id',
    model: populateKeyword,
  })
}

const formAggregateResponse = (aggregationResult, options) => {
  // console.log("aggregationResult", aggregationResult.length)
  const totalCount = aggregationResult.length
  const totalPages = Math.ceil(totalCount / options.limit);

  return {
    aggregationResult,
    totalDocs: totalCount,
    limit: options.limit,
    totalPages,
    page: options.page,
    hasNextPage: options.page < totalPages,
    hasPrevPage: options.page > 1,
    prevPage: options.page > 1 ? options.page - 1 : null,
    nextPage: options.page < totalPages ? options.page + 1 : null
  }
}













































// export
module.exports = { usersRouter };


