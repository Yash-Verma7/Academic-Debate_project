const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const User = require('./models/User');
const Debate = require('./models/Debate');
const LiveChat = require('./models/LiveChat');
const Argument = require('./models/Argument');

dotenv.config();

const MOCK_USERS = [
  { name: 'John', role: 'student', avatar: 'https://i.pravatar.cc/150?img=1', email: 'john@test.com' },
  { name: 'Alice', role: 'student', avatar: 'https://i.pravatar.cc/150?img=2', email: 'alice@test.com' },
  { name: 'David', role: 'student', avatar: 'https://i.pravatar.cc/150?img=3', email: 'david@test.com' },
  { name: 'Emma', role: 'moderator', avatar: 'https://i.pravatar.cc/150?img=4', email: 'emma@test.com' },
  { name: 'Noah', role: 'other', avatar: 'https://i.pravatar.cc/150?img=5', email: 'noah@test.com' }
];

const MOCK_DEBATES = [
  {
    title: 'Online Classes vs Offline Classes',
    topic: 'Education',
    description: 'Debating effectiveness of online and offline learning models.',
    category: 'Education',
    proParticipant: 'John',
    conParticipant: 'Alice'
  },
  {
    title: 'AI vs Human Intelligence',
    topic: 'Technology',
    description: 'Comparing machine intelligence and human thinking in decision making.',
    category: 'Technology',
    proParticipant: 'David',
    conParticipant: 'John'
  }
];

const buildUsers = async () => {
  const passwordHash = await bcrypt.hash('123456', 10);

  return MOCK_USERS.map((item) => ({
    name: item.name,
    firstName: item.name,
    lastName: '',
    email: item.email,
    password: passwordHash,
    role: item.role,
    points: Math.floor(Math.random() * 151),
    profileImage: item.avatar,
    avatarUrl: item.avatar
  }));
};

const buildDebates = (userMap) => {
  const now = Date.now();

  return MOCK_DEBATES.map((item, index) => {
    const startTime = new Date(now - (index + 1) * 15 * 60 * 1000);
    const endTime = new Date(now + (index + 2) * 60 * 60 * 1000);
    const proUser = userMap.get(item.proParticipant);
    const conUser = userMap.get(item.conParticipant);
    const creator = userMap.get('Emma') || proUser;

    return {
      title: item.title,
      topic: item.topic,
      description: item.description,
      category: item.category,
      status: 'live',
      startTime,
      endTime,
      scheduledTime: startTime,
      createdBy: creator._id,
      participants: {
        proUser: proUser._id,
        conUser: conUser._id
      },
      participantLabels: {
        proLabel: proUser.name,
        conLabel: conUser.name
      },
      watchersCount: 2,
      watchedBy: [userMap.get('Noah')._id, creator._id],
      proVotes: 12 + index,
      conVotes: 9 + index
    };
  });
};

const buildArguments = (debates, userMap) => {
  const firstDebateId = debates[0]._id;
  const secondDebateId = debates[1]._id;

  return [
    {
      userId: userMap.get('John')._id,
      debateId: firstDebateId,
      side: 'pro',
      type: 'argument',
      content: 'Online classes save time',
      createdAt: new Date(Date.now() - 28 * 60 * 1000),
      updatedAt: new Date(Date.now() - 28 * 60 * 1000)
    },
    {
      userId: userMap.get('Alice')._id,
      debateId: firstDebateId,
      side: 'con',
      type: 'argument',
      content: 'Offline classes improve focus',
      createdAt: new Date(Date.now() - 24 * 60 * 1000),
      updatedAt: new Date(Date.now() - 24 * 60 * 1000)
    },
    {
      userId: userMap.get('John')._id,
      debateId: firstDebateId,
      side: 'pro',
      type: 'rebuttal',
      content: 'But flexibility matters',
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000)
    },
    {
      userId: userMap.get('David')._id,
      debateId: secondDebateId,
      side: 'pro',
      type: 'argument',
      content: 'AI helps process complex information faster',
      createdAt: new Date(Date.now() - 16 * 60 * 1000),
      updatedAt: new Date(Date.now() - 16 * 60 * 1000)
    },
    {
      userId: userMap.get('John')._id,
      debateId: secondDebateId,
      side: 'con',
      type: 'question',
      content: 'Can AI fully replace emotional intelligence?',
      createdAt: new Date(Date.now() - 12 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 1000)
    }
  ];
};

const buildLiveChats = (debates, userMap) => {
  const firstDebateId = debates[0]._id;
  const secondDebateId = debates[1]._id;

  return [
    {
      userId: userMap.get('Noah')._id,
      debateId: firstDebateId,
      role: 'audience',
      message: 'I support AI 🤖',
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000)
    },
    {
      userId: userMap.get('Emma')._id,
      debateId: firstDebateId,
      role: 'audience',
      message: 'Keep discussion respectful',
      createdAt: new Date(Date.now() - 8 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 60 * 1000)
    },
    {
      userId: userMap.get('Noah')._id,
      debateId: secondDebateId,
      role: 'audience',
      message: 'Interesting points from both sides',
      createdAt: new Date(Date.now() - 6 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 1000)
    }
  ];
};

const clearDatabase = async () => {
  await Promise.all([
    LiveChat.deleteMany({}),
    Argument.deleteMany({}),
    Debate.deleteMany({}),
    User.deleteMany({})
  ]);
};

const run = async () => {
  const hasForce = process.argv.includes('--force');

  if (!hasForce) {
    console.warn('This will delete all database data');
    console.warn('Aborted. Re-run with --force to continue.');
    process.exit(1);
  }

  console.warn('This will delete all database data');

  try {
    await connectDB();

    await clearDatabase();
    console.log('✅ Database cleared');

    const users = await User.insertMany(await buildUsers());
    console.log(`✅ Users created: ${users.length}`);

    const userMap = new Map(users.map((user) => [user.name, user]));

    const debates = await Debate.insertMany(buildDebates(userMap));
    console.log(`✅ Debates created: ${debates.length}`);

    const argumentsData = await Argument.insertMany(buildArguments(debates, userMap));
    console.log(`✅ Arguments created: ${argumentsData.length}`);

    const chats = await LiveChat.insertMany(buildLiveChats(debates, userMap));
    console.log(`✅ Live chats created: ${chats.length}`);

    console.log('Seeding finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();