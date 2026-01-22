const EMAIL_CONTACTS = {
  circulation: "librarycirc-group@uri.edu",
  itCampus: "helpdesk@uri.edu",
  itLibrary: "libtechsupport@uri.edu",
  housekeeping: "libadmin-group@uri.edu",
  facilities: "libadmin-group@uri.edu",
  deansOffice: "libadmin-group@uri.edu"
};

const ISSUE_MAPPINGS = {
  "Noise complaint - Circulation 🔊": "circulation",
  "Missing personal item - Circulation 🔍": "circulation",
  "Turn on lights - Circulation 💡": "circulation",
  "Printer problem - IT (Campus) 🖨️": "itCampus",
  "Library computers - IT (Library) 🖥️": "itLibrary",
  "Restroom needs restocking - Housekeeping 🧻": "housekeeping",
  "Cleaning needed - Housekeeping 🧹": "housekeeping",
  "Spill - Housekeeping 🫗": "housekeeping",
  "Vending machine issue - Facilities 🧃": "facilities",
  "Water fountain issue - Facilities 💧": "facilities",
  "Repairs needed - Facilities 🔨": "facilities",
  "Graffiti - Dean's Office ❌": "deansOffice",
  "Vandalism - Dean's Office ⚠️": "deansOffice",
  "Safety issue - Dean's Office 🦺": "deansOffice"
};

function onFormSubmit(e) {
  const itemResponses = e.response.getItemResponses();
  
  let issueTypes = [];
  let floor = "";
  let location = "";
  let additionalInfo = "";
  let contactInfo = "";
  let hasPhoto = false;
  
  itemResponses.forEach(function(itemResponse) {
    const question = itemResponse.getItem().getTitle();
    const answer = itemResponse.getResponse();
    
    if (question.includes("What kind of problem")) {
      issueTypes = Array.isArray(answer) ? answer : [answer];
    } else if (question.includes("What floor")) {
      floor = answer;
    } else if (question.includes("room, internal landmark")) {
      location = answer;
    } else if (question.includes("Upload a picture")) {
      hasPhoto = answer && answer.length > 0;
    } else if (question.includes("anything else we should know")) {
      additionalInfo = answer || "";
    } else if (question.includes("name and email")) {
      contactInfo = answer || "";
    }
  });
  
  const departmentsToNotify = {};
  
  issueTypes.forEach(function(issue) {
    const department = ISSUE_MAPPINGS[issue] || "deansOffice";
    if (!departmentsToNotify[department]) {
      departmentsToNotify[department] = [];
    }
    departmentsToNotify[department].push(issue);
  });
  
  for (const [department, issues] of Object.entries(departmentsToNotify)) {
    const ccEmail = department === "itCampus" ? EMAIL_CONTACTS.itLibrary : null;
    sendNotificationEmail(EMAIL_CONTACTS[department], issues, floor, location, additionalInfo, contactInfo, hasPhoto, ccEmail);
  }
}

function sendNotificationEmail(recipientEmail, issues, floor, location, additionalInfo, contactInfo, hasPhoto, ccEmail) {
  const subject = "Library Issue Report: " + issues[0].split(" - ")[0];
  const timestamp = new Date().toLocaleString();
  
  let body = "═══════════════════════════════════════════════════════\n";
  body += "        CAROTHERS LIBRARY ISSUE REPORT\n";
  body += "═══════════════════════════════════════════════════════\n\n";
  
  body += "REPORTED: " + timestamp + "\n\n";
  
  body += "───────────────────────────────────────────────────────\n";
  body += "ISSUE DETAILS\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Problem Type(s):\n";
  issues.forEach(function(issue) {
    body += "   - " + issue + "\n";
  });
  
  body += "\nFloor: " + (floor || "Not specified") + "\n";
  body += "\nLocation/Landmark: " + (location || "Not specified") + "\n";
  
  body += "\n───────────────────────────────────────────────────────\n";
  body += "ADDITIONAL INFORMATION\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Photo Attached: " + (hasPhoto ? "Yes (view in form response)" : "No") + "\n";
  body += "\nAdditional Notes:\n";
  body += "   " + (additionalInfo || "None provided") + "\n";
  
  body += "\n───────────────────────────────────────────────────────\n";
  body += "REPORTER CONTACT\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Contact Info: " + (contactInfo || "Anonymous (no contact provided)") + "\n";
  
  body += "\n═══════════════════════════════════════════════════════\n";
  body += "This is an automated notification from the Library Issue\n";
  body += "Reporting form. View all responses in the linked\n";
  body += "Google Sheet for complete details and uploaded photos.\n";
  body += "═══════════════════════════════════════════════════════\n";
  
  const emailOptions = { to: recipientEmail, subject: subject, body: body };
  if (ccEmail) {
    emailOptions.cc = ccEmail;
  }
  MailApp.sendEmail(emailOptions);
}
