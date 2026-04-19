const cron = require('node-cron');
const Debate = require('../models/Debate');

const getLifecycleStatus = (debate, now) => {
  const start = debate.startTime || debate.scheduledTime;
  const end = debate.endTime;

  if (!start || !end) return debate.status || 'upcoming';

  const startTime = new Date(start);
  const endTime = new Date(end);

  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'live';
  return 'completed';
};

const runDebateLifecycleTick = async (io) => {
  const now = new Date();

  const candidates = await Debate.find({ status: { $in: ['upcoming', 'live'] } })
    .select('_id status startTime scheduledTime endTime');

  if (!candidates.length) return;

  const operations = [];
  const changed = [];

  candidates.forEach((debate) => {
    const nextStatus = getLifecycleStatus(debate, now);
    const startTime = debate.startTime || debate.scheduledTime;

    const shouldUpdateStatus = nextStatus !== debate.status;
    const shouldSyncStartAlias = !debate.startTime && !!debate.scheduledTime;

    if (!shouldUpdateStatus && !shouldSyncStartAlias) {
      return;
    }

    const setPayload = {};
    if (shouldUpdateStatus) {
      setPayload.status = nextStatus;
      changed.push({ debateId: debate._id.toString(), status: nextStatus });
    }
    if (shouldSyncStartAlias) {
      setPayload.startTime = startTime;
    }

    operations.push({
      updateOne: {
        filter: { _id: debate._id },
        update: { $set: setPayload }
      }
    });
  });

  if (!operations.length) return;

  await Debate.bulkWrite(operations);

  if (io && changed.length) {
    changed.forEach((item) => {
      io.to(item.debateId).emit('debateStatusChanged', item);
      io.emit('debateStatusChanged', item);
    });
    io.emit('debateLifecycleUpdated', {
      updatedCount: changed.length,
      at: now.toISOString()
    });
  }
};

const startCronJobs = (io) => {
  cron.schedule('*/10 * * * * *', async () => {
    try {
      await runDebateLifecycleTick(io);
    } catch (error) {
      console.error('Error in debate status cron job:', error.message);
    }
  });
};

module.exports = startCronJobs;
