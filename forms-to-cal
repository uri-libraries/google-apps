function onFormSubmit(e) {
  const calendar = CalendarApp.getCalendarById('<insertCalIDhere'); // Google Calendar ID here
  const responses = e.values;

  if (!responses || responses.length < 25) {
    Logger.log('Error: Form responses are missing or incomplete. Cannot proceed.');
    return;
  }

  const firstName = responses[2];
  const lastName = responses[3];
  const phone = responses[7];
  const email = responses[8];
  const eventName = responses[9];
  const description = `Submitted by: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}`;

  const eventSets = [
    { date: responses[10], start: responses[11], end: responses[12] },
    { date: responses[14], start: responses[15], end: responses[16] },
    { date: responses[18], start: responses[19], end: responses[20] },
    { date: responses[22], start: responses[23], end: responses[24] }
  ];

  Logger.log('--- Starting Event Creation Process ---');
  Logger.log(`Form Submitted By: ${firstName} ${lastName}`);
  Logger.log(`Base Event Name: ${eventName}`);

  // Helper function to convert 12-hour time (with AM/PM) to 24-hour format
  function convertTo24Hour(time12h) {
    if (!time12h) return '';
    const parts = time12h.split(' ');
    const time = parts[0];
    const period = parts[1] ? parts[1].toUpperCase() : ''; // Get AM/PM part

    let [hours, minutes, seconds] = time.split(':');

    hours = parseInt(hours, 10);

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) { // Midnight (12 AM) is 00 hours
      hours = 0;
    }

    // Pad with leading zeros if necessary
    hours = String(hours).padStart(2, '0');
    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds || '00').padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  eventSets.forEach((set, index) => {
    Logger.log(`Processing Event Set ${index + 1}:`);
    Logger.log(`  Raw Date: ${set.date}, Raw Start: ${set.start}, Raw End: ${set.end}`);

    if (set.date && set.start && set.end) {
      let startDateTime, endDateTime;

      try {
        // --- IMPORTANT: Handle MM/DD/YYYY Date Format AND pad single digits ---
        const [monthRaw, dayRaw, year] = set.date.split('/');

        // Pad month and day with leading zeros if they are single digits
        const month = String(parseInt(monthRaw, 10)).padStart(2, '0');
        const day = String(parseInt(dayRaw, 10)).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD (now with leading zeros)

        const convertedStartTime = convertTo24Hour(set.start);
        const convertedEndTime = convertTo24Hour(set.end);

        startDateTime = new Date(`${formattedDate}T${convertedStartTime}`);
        endDateTime = new Date(`${formattedDate}T${convertedEndTime}`);

        Logger.log(`  Formatted Date (with padding): ${formattedDate}`);
        Logger.log(`  Converted Start Time: ${convertedStartTime}`);
        Logger.log(`  Converted End Time: ${convertedEndTime}`);
        Logger.log(`  Combined Start String (for new Date): ${formattedDate}T${convertedStartTime}`);
        Logger.log(`  Combined End String (for new Date): ${formattedDate}T${convertedEndTime}`);
        Logger.log(`  Parsed Start DateTime Object: ${startDateTime}`);
        Logger.log(`  Parsed End DateTime Object: ${endDateTime}`);
        Logger.log(`  Is Start Date Valid? ${!isNaN(startDateTime.getTime())}`);
        Logger.log(`  Is End Date Valid? ${!isNaN(endDateTime.getTime())}`);

        if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
          calendar.createEvent(eventName, startDateTime, endDateTime, {
            description: description
          });
          Logger.log(`  SUCCESS: Event "${eventName}" created for ${startDateTime} to ${endDateTime}`);
        } else {
          Logger.log(`  WARNING: Skipping event creation for set ${index + 1} due to invalid date/time parsing.`);
        }
      } catch (error) {
        Logger.log(`  ERROR: Failed to parse date/time for set ${index + 1}. Error: ${error.message}`);
      }
    } else {
      Logger.log(`  Skipping Event Set ${index + 1} because date, start, or end time is missing.`);
    }
  });

  Logger.log('--- Event Creation Process Completed ---');
}
