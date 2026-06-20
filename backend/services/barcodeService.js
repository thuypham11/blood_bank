import BarcodeSequence from "../models/BarcodeSequenceModel.js";
import Facility from "../models/facilityModel.js";

const sanitizeFacilityCode = (value) => {
    const normalized = String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 16);

    return normalized || "FACILITY";
};

const getNextValue = async (sequenceId) => {
    try {
        const sequence = await BarcodeSequence.findOneAndUpdate(
            { _id: sequenceId },
            { $inc: { value: 1 } },
            { new: true, upsert: true }
        );
        return sequence.value;
    } catch (error) {
        // Two first-time upserts can race on the unique _id. Retrying without
        // upsert preserves one atomic sequence and never reuses an issued ID.
        if (error?.code !== 11000) throw error;

        const sequence = await BarcodeSequence.findOneAndUpdate(
            { _id: sequenceId },
            { $inc: { value: 1 } },
            { new: true }
        );
        return sequence.value;
    }
};

export const generateBloodStorageId = async ({ facilityId, date = new Date() }) => {
    const facility = await Facility.findById(facilityId).select("registrationNumber");

    if (!facility) {
        const error = new Error("Không tìm thấy cơ sở cấp mã barcode");
        error.statusCode = 404;
        throw error;
    }

    const facilityCode = sanitizeFacilityCode(
        facility.registrationNumber || facility._id.toString().slice(-8)
    );
    const year = new Date(date).getUTCFullYear();
    const sequenceId = `blood-storage:${facilityCode}:${year}`;
    const nextValue = await getNextValue(sequenceId);

    return `BBU-${facilityCode}-${year}-${String(nextValue).padStart(8, "0")}`;
};
