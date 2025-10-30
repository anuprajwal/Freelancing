const {doctorSlots, doctorProfile, organisationProfile} = require("../../../../models")

const getHospitalSlots = async (req, res)=>{
    const {hospitalId} = req.params

    if (!hospitalId){
        return res.status(400).json({error:"hospital id is not found in the request"})
    }

    const hospital_data = await organisationProfile.findOne({
        where:{
            id: hospitalId
        }
    })

    if (!hospital_data){
        return res.status(404).json({error:"cant find the desired hospital"})
    }

    const allDoctorsInHospitals = await doctorProfile.findAll({
        where:{
            organisation_id : hospitalId
        },
        attributes:["user_id"]
    })

    const doctorSlot = await doctorSlots.findAll({
        where:{
            doctor_id:allDoctorsInHospitals.map(doctor=>doctor.user_id)
        }
    })

    const allDoctorSlots = doctorSlot.flatMap(d => d.slots); // extract all doctor slots arrays

// Combine by day, avoiding duplicates
const combinedSlots = [];

allDoctorSlots.forEach(doctor => {
  doctor.slots.forEach(daySlot => {
    const existingDay = combinedSlots.find(s => s.day === daySlot.day);

    if (existingDay) {
      // Merge slots uniquely
      const existingSet = new Set(
        existingDay.slots.map(s => `${s.start}-${s.end}`)
      );

      daySlot.slots.forEach(slot => {
        const key = `${slot.start}-${slot.end}`;
        if (!existingSet.has(key)) {
          existingDay.slots.push(slot);
          existingSet.add(key);
        }
      });
    } else {
      // Add a new day entry
      combinedSlots.push({
        day: daySlot.day,
        date: daySlot.date,
        mode: daySlot.mode,
        slots: [...daySlot.slots],
      });
    }
  });
});

console.log(JSON.stringify(combinedSlots, null, 2));


    return res.status(200).json({combinedSlots})
}


module.exports = getHospitalSlots