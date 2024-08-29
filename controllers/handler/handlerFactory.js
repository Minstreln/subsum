const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');
const APIFeatures = require('../../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No Doc found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    query = query.lean();

    if (!doc) {
      return next(new AppError('No doc found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// exports.getAll = (Model) => catchAsync(async (req, res, next) => {
//     let filter = Model.find();

//     const features = new APIFeatures(filter, req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();

//     const doc = await features;

//     res.status(200).json({
//       status: 'success',
//       results: doc.length,
//       data: {
//         data: doc,
//       },
//     });
// });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // console.log(req.query);
    let filter = {};
    if (req.params.customerId) filter = { advisor: req.params.customerId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features;

    if (doc.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        message: 'No  doc found.',
      });
    }

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
});
