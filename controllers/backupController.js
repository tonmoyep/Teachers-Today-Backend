//all jobs 
exports.allJobAdmin = async (req, res) => {
    try {
        const {
            name,
            filter, 
            assigned, 
            type, 
            search, 
            arrayField, 
            gender, 
            city, 
            area, 
            category, 
            classCourse, 
            subject, 
            day, 
            tutorGender, 
            postedDateFrom, 
            postedDateTo, 
            archiveReason,
            paymentType
        } = req.query;
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        let match = {};
        let query = {};
        let tuitionData
        const splitToArray = (param) => {
            return param ? param.split(',') : [];
        }; 
        if (name) {
            const results = await Tutor.find({ fullName: { $regex: `.*${name}.*`, $options: "i" } });
            if (results.length === 0) {
                return res.status(200).json(successResponse(true, 200, "No records found with this name", []));
            }
            return res.status(200).json(successResponse(true, 200, "Data found", results));
        }
        if (gender) query.gender = { $in: splitToArray(gender) };
        if (city) query.city = { $in: splitToArray(city) };
        if (area) query.area = { $in: splitToArray(area) };
        if (category) query.category = { $in: splitToArray(category) };
        if (classCourse) query.classCourse = { $in: splitToArray(classCourse) };
        if (subject) query.subject = { $in: splitToArray(subject) };
        if (day) query.day = { $in: splitToArray(day) };
        if (tutorGender) query.tutorGender = { $in: splitToArray(tutorGender) };
        if (postedDateFrom && postedDateTo) {
            query.postedDate = {
                $gte: new Date(postedDateFrom),
                $lte: new Date(postedDateTo)
            };
        }
        if (archiveReason) query.archiveReason = archiveReason;
        // If there are filters, perform the query
        if (Object.keys(query).length > 0) {
            const users = await Tution.find(query);
            if (users.length === 0) {
                return res.status(200).json(successResponse(true, 200, "There is no related data found", []));
            }
            return res.status(200).json(successResponse(true, 200, "Filtered data found", users));
        }
        // 3. Jobs Search with Multiple Filters
        if (type) match.status = type;
        if (arrayField) {
            const arrayFieldMapping = { 
                shortListed: "shortListed",
                pendingConfirmation: "pendingConfirmation",
                pendingVerification: "pendingVerification",
                classBooked: "classBooked",
                followUpGuardian: "followUpGuardian",
                followUpTutor: "followUpTutor",
                archived: "archived",
            };
            if (arrayFieldMapping[arrayField]) {
                match[arrayFieldMapping[arrayField]] = { $exists: true, $ne: [] };
            }
        }
        if (assigned) match.assigned = new mongoose.Types.ObjectId(assigned);
        if (search) {
            match.$or = [
                { studentName: { $regex: `.*${search}.*`, $options: "i" } },
                { studentGender: { $regex: `.*${search}.*`, $options: "i" } },
                { class: { $regex: `.*${search}.*`, $options: "i" } },
                { category: { $regex: `.*${search}.*`, $options: "i" } },
                { city: { $regex: `.*${search}.*`, $options: "i" } },
                { tutorGender: { $regex: `.*${search}.*`, $options: "i" } },
            ];
        }
        if (filter) {
            const parsedFilter = JSON.parse(filter);
            match = { ...match, ...parsedFilter };
        }
        if(paymentType) {
            let paymentFilter = {}
            if(paymentType === "overdue") paymentFilter = {}
            else paymentFilter = {"paymentsDataForThisTuition.type": paymentType}
            tuitionData = await Tution.aggregate([
                {
                    $lookup: {
                        from: "payments",
                        localField: "_id",
                        foreignField: "forTuition",
                        as: "paymentsDataForThisTuition"
                    }
                },
                {
                    $lookup: {
                        from: "guardians",
                        localField: "jobPoster",
                        foreignField: "_id",
                        as: "guadiansData"
                    }
                },
                {
                    $lookup: {
                        from: "payments",
                        localField: "classBooked",
                        foreignField: "forTutor",
                        as: "paymentData",
                    },
                },
                {$skip: skip},
                {$limit: limit},
                {$match: paymentFilter},
                {
                    $project: {
                        paymentsDataForThisTuition: {
                            $map: {
                                input: "$paymentsDataForThisTuition",
                                as: "payment",
                                in: {
                                    _id: "$$payment._id",
                                    paid: "$$payment.paid",
                                    refund: "$$payment.refund",
                                    dueDate: "$$payment.dueDate",
                                    type: "$$payment.type",
                                    overdue: {
                                        $cond: {
                                            if: { $gt: ["$$payment.dueDate", null] },  
                                            then: {
                                                $divide: [
                                                    { $subtract: [ "$$NOW", "$$payment.dueDate" ] },
                                                    1000 * 60 * 60 * 24 
                                                ]
                                            },
                                            else: null
                                        }
                                    }
                                }
                            }
                        },
                        "paymentData._id": 1,
                        "paymentData.type": 1,
                        "paymentData.forTuition": 1,
                        "paymentData.forTutor": 1,
                        "guadiansData.fullName": 1,
                        "guadiansData.phoneNumber": 1,
                        "studentGender": 1,
                        "hireDate": 1,
                        "createdAt": 1,
                        "className": 1,
                        "subject": 1,
                        "dayPerWeek": 1,
                        "city": 1,
                        "area": 1,
                        "salary": 1,
                        "reasonToCancel": 1,
                        "reminder": 1,
                        "startingDate": 1,
                        "pendingVerification": 1,
                        "followUpTutor": 1,
                        "classBooked": 1,
                        "followUpGuardian": 1,
                        "archived": 1,
                    }
                }
            ])
            return res.status(200).json(successResponse(true, 200, "tuitions data ", tuitionData));
        }
        tuitionData = await Tution.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "guardians",
                    localField: "jobPoster",
                    foreignField: "_id",
                    as: "guardian",
                },
            },
            {
                $lookup: {
                    from: "payments",
                    localField: "classBooked",
                    foreignField: "forTutor",
                    as: "paymentData",
                },
            },
            {$skip: skip},
            {$limit: limit},
            {
                $project: {
                    "guardian.fullName": 1,
                    "guardian.phoneNumber": 1,
                    "paymentData._id": 1,
                    "paymentData.type": 1,
                    "paymentData.forTuition": 1,
                    "paymentData.forTutor": 1,
                    studentGender: 1,
                    hireDate: 1,
                    createdAt: 1,
                    className: 1,
                    subject: 1,
                    dayPerWeek: 1,
                    city: 1,
                    area: 1,
                    salary: 1,
                    reasonToCancel: 1,
                    reminder: 1,
                    pendingVerification: 1,
                    followUpTutor: 1,
                    classBooked: 1,
                    followUpGuardian: 1,
                    archived: 1,
                },
            },
        ]);
        if (tuitionData.length === 0) {
            return res.status(200).json(successResponse(true, 200, "There is no related data found", []));
        }

        return res.status(200).json(successResponse(true, 200, "Tuition data found", tuitionData));
    } catch (error) {
        console.error("Error fetching job admin data:", error); 
        return res.status(500).json(successResponse(false, 500, "An error occurred while processing your request."));
    }
};


//all leads
exports.getTuitionsUpdated = async (req, res) => {
    try {
        const { type, assigned, fromDate, toDate, id, name, jobId, reminder } = req.query;
        let result;

        if (id && !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(statusResponse(false, 400, "Invalid 'id' format", []));
        }
        if (assigned && !mongoose.Types.ObjectId.isValid(assigned)) {
            return res.status(400).json(statusResponse(false, 400, "Invalid 'assigned' ID format", []));
        }

        if (reminder && id) {
            const userData = await Tution.findById(id, { reminder: 1 });

            if (!userData) {
                return res.status(200).json(statusResponse(true, 200, "Tuition not found", []));
            }

            return res.status(200).json(statusResponse(true, 200, "Reminder dates fetched", userData.reminder));
        } else if (id || name || jobId) {
            const query = {};
            if (id) query._id = new mongoose.Types.ObjectId(id);
            if (name) query.name = name;
            if (jobId) query.jobId = jobId;

            const jobData = await Tution.findOne(query);

            if (!jobData) {
                return res.status(200).json(statusResponse(true, 200, 'Job not found', []));
            }

            return res.status(200).json(statusResponse(true, 200, 'Job data', jobData));
        } else if (fromDate && toDate) {
            const parsedFromDate = new Date(fromDate);
            const parsedToDate = new Date(toDate);

            if (isNaN(parsedFromDate) || isNaN(parsedToDate)) {
                return res.status(400).json(statusResponse(false, 400, "Invalid date format", []));
            }

            result = await Tution.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: parsedFromDate,
                            $lte: parsedToDate
                        }
                    }
                },
                {
                    $project: {
                        createdAt: 1,
                        jobId: 1,
                        reminder: 1,
                        status: 1,
                        assigned: 1,
                        studentName: 1
                    }
                },
                {$sort: {createdAt: -1}}
            ]);
            const statusCount = await Tution.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: parsedFromDate,
                            $lte: parsedToDate
                        }
                    }
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            return res.status(200).json(statusResponse(true, 200, "Tuition data", { result, statusCount }));
        } else if (assigned) {
            result = type 
                ? await getSpecificTuitionsForSuperAdmin(type, assigned)
                : await Tution.aggregate([
                    {
                        $match: { assigned: new mongoose.Types.ObjectId(assigned) }
                    },
                    {
                        $lookup: {
                            from: "guardians",
                            localField: "jobPoster",
                            foreignField: "_id",
                            as: "jobPosters"
                        }
                    },
                    {
                        $lookup: {
                            from: "admins",
                            localField: "jobPosterAdmin",
                            foreignField: "_id",
                            as: "jobPostersAdmin"
                        }
                    },
                    {
                        $lookup: {
                            from: "superadmins",
                            localField: "jobPosterSuperAdmin",
                            foreignField: "_id",
                            as: "jobPostersSuperAdmin"
                        }
                    },
                    {
                        $project: {
                            createdAt: 1,
                            "jobPosters.fullName": 1,
                            "jobPostersAdmin.fullName": 1,
                            "jobPostersSuperAdmin.fullName": 1,
                            reminder: 1,
                            status: 1,
                            assigned: 1,
                            studentName: 1,
                            jobId: 1
                        }
                    },
                    {$sort: {createdAt: -1}}
                ]);
            const statusCount = await Tution.aggregate([
                {
                    $match: { assigned: new mongoose.Types.ObjectId(assigned) }
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            return res.status(200).json(statusResponse(true, 200, "Tuition data", { result, statusCount }));
        } else if (type) {
            result = await getAllTuitionForSuperAdmin(type);
    
            const statusCount = await Tution.aggregate([
                {
                    $match: { status: type }
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            return res.status(200).json(statusResponse(true, 200, `${type} tuitions`, { result, statusCount }));
        } else {
            result = await Tution.aggregate([
                {
                    $lookup: {
                        from: "guardians",
                        localField: "jobPoster",
                        foreignField: "_id",
                        as: "jobPosters"
                    }
                },
                {
                    $lookup: {
                        from: "admins",
                        localField: "jobPosterAdmin",
                        foreignField: "_id",
                        as: "jobPostersAdmin"
                    }
                },
                {
                    $lookup: {
                        from: "superadmins",
                        localField: "jobPosterSuperAdmin",
                        foreignField: "_id",
                        as: "jobPostersSuperAdmin"
                    }
                },
                {
                    $project: {
                        createdAt: 1,
                        "jobPosters.fullName": 1,
                        "jobPostersAdmin.fullName": 1,
                        "jobPostersSuperAdmin.fullName": 1,
                        reminder: 1,
                        status: 1,
                        assigned: 1,
                        studentName: 1,
                        jobId: 1
                    }
                },
                {$sort: {createdAt: -1}}
            ]);
            const statusCount = await Tution.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            return res.status(200).json(statusResponse(true, 200, "All tuitions", { result, statusCount }));
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json(statusResponse(false, 500, "An unexpected error occurred", []));
    }
};