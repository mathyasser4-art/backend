const fs = require('fs');
const p = 'src/modules/competition/controller/competition.controller.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/await pusher\.trigger\(\{\s*channel:\s*'([^']+)',\s*name:\s*'([^']+)',\s*data:\s*(JSON\.stringify\(\{[\s\S]*?\}\))\s*\}\);/g, "await pusher.trigger('$1', '$2', $3);");
c = c.replace(/await pusher\.trigger\(\{\s*channel:\s*channelName,\s*name:\s*'([^']+)',\s*data:\s*(JSON\.stringify\(eventData\))\s*\}\);/g, "await pusher.trigger(channelName, '$1', $2);");
c = c.replace(/await pusher\.trigger\(\{\s*channel:\s*`([^`]+)`,\s*name:\s*'([^']+)',\s*data:\s*(JSON\.stringify\(\{[\s\S]*?\}\))\s*\}\);/g, "await pusher.trigger(`$1`, '$2', $3);");
c = c.replace(/await pusher\.trigger\(\{\s*channel:\s*channelName,\s*name:\s*eventName,\s*data:\s*(typeof eventData === 'string' \? eventData : JSON\.stringify\(eventData\))\s*\}\);/g, "await pusher.trigger(channelName, eventName, $1);");

// Fix schoolName null problem when Topsoroban creates a competition
c = c.replace(
    /const teacher = await userModel\.findById\(teacherID\)\.select\('userName createdBy'\)\.populate\('createdBy', 'userName'\);\s*const teacherName = teacher \? teacher\.userName : "Your Teacher";\s*const schoolId = teacher && teacher\.createdBy \? String\(teacher\.createdBy\._id \|\| teacher\.createdBy\) : null;\s*const schoolName = teacher && teacher\.createdBy \? teacher\.createdBy\.userName : null;/,
    `const teacher = await userModel.findById(teacherID).select('userName createdBy role').populate('createdBy', 'userName');
        const teacherName = teacher ? teacher.userName : "Your Teacher";
        
        let schoolId = null;
        let schoolName = null;
        if (teacher) {
            if (teacher.role === 'School' || teacher.role === 'Admin' || teacher.role === 'IT') {
                schoolId = String(teacher._id);
                schoolName = teacher.userName;
            } else if (teacher.createdBy) {
                schoolId = String(teacher.createdBy._id || teacher.createdBy);
                schoolName = teacher.createdBy.userName;
            }
        }`
);

fs.writeFileSync(p, c);
console.log('Patch complete.');
