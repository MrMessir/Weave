module.exports = async (DB, bcrypt) => {
  console.log('⏳ Инициализация данных...');
  
  // Хешируем пароли для тестовых пользователей
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Тестовые пользователи
  const users = [
    {
      id: 'user1',
      firstName: 'Мария',
      lastName: 'Волкова',
      username: 'mvolkova',
      email: 'maria@weave.app',
      password: hashedPassword,
      avatarColor: 0,
      createdAt: '2024-01-15T10:30:00Z',
      bio: 'Frontend developer ✦ Создаю красивые интерфейсы ✦ Люблю Vue и дизайн',
      website: 'https://github.com/mvolkova'
    },
    {
      id: 'user2',
      firstName: 'Артём',
      lastName: 'Зайцев',
      username: 'art_dev',
      email: 'artem@weave.app',
      password: hashedPassword,
      avatarColor: 1,
      createdAt: '2024-01-16T14:20:00Z',
      bio: 'Backend разработчик. Люблю кофе и чистый код ☕',
      website: ''
    },
    {
      id: 'user3',
      firstName: 'Дарья',
      lastName: 'Смирнова',
      username: 'dasha_s',
      email: 'dasha@weave.app',
      password: hashedPassword,
      avatarColor: 2,
      createdAt: '2024-01-17T09:15:00Z',
      bio: 'UI/UX дизайнер. Делаю мир красивее ✨',
      website: 'https://dasha.design'
    },
    {
      id: 'user4',
      firstName: 'Никита',
      lastName: 'Орлов',
      username: 'n_orlov',
      email: 'nikita@weave.app',
      password: hashedPassword,
      avatarColor: 3,
      createdAt: '2024-01-18T16:45:00Z',
      bio: 'Mobile dev, Flutter enthusiast',
      website: ''
    },
    {
      id: 'user5',
      firstName: 'Алина',
      lastName: 'Петрова',
      username: 'alina_p',
      email: 'alina@weave.app',
      password: hashedPassword,
      avatarColor: 4,
      createdAt: '2024-01-19T11:30:00Z',
      bio: 'Product manager. Люблю когда всё работает 🚀',
      website: ''
    }
  ];
  
  DB.users.push(...users);
  
  // Инициализируем коллекции для пользователей
  users.forEach(u => {
    DB.following.set(u.id, new Set());
    DB.bookmarks.set(u.id, new Set());
  });
  
  // Добавляем подписки
  DB.following.get('user1').add('user2').add('user3');
  DB.following.get('user2').add('user1').add('user4');
  DB.following.get('user3').add('user1').add('user5');
  
  // Тестовые посты
  const posts = [
    {
      id: 'post1',
      authorId: 'user1',
      text: 'Только что запустила первый проект на Vue 3! 🚀 #webdev #vue',
      images: [],
      createdAt: '2024-01-20T09:23:00Z',
      edited: false,
      reposts: 3
    },
    {
      id: 'post2',
      authorId: 'user2',
      text: 'Weave выглядит просто 🔥 Наконец нормальный дизайн! @weave держите так дальше',
      images: [],
      createdAt: '2024-01-20T10:45:00Z',
      edited: false,
      reposts: 8
    },
    {
      id: 'post3',
      authorId: 'user3',
      text: 'CSS Grid subgrid меняет всё! #css #frontend',
      images: [],
      createdAt: '2024-01-19T22:12:00Z',
      edited: false,
      reposts: 14
    },
    {
      id: 'post4',
      authorId: 'user4',
      text: '73% разработчиков гуглят как центрировать div каждый раз 😅 #devlife',
      images: [],
      createdAt: '2024-01-19T15:30:00Z',
      edited: false,
      reposts: 25
    },
    {
      id: 'post5',
      authorId: 'user1',
      text: 'Подготовила доклад по Vue 3 для митапа. Кто пойдет? #vue #митап',
      images: [],
      createdAt: '2024-01-18T14:20:00Z',
      edited: false,
      reposts: 5
    }
  ];
  
  DB.posts.push(...posts);
  
  // Инициализируем лайки
  posts.forEach(p => DB.likes.set(p.id, new Set()));
  DB.likes.get('post1').add('user2').add('user3');
  DB.likes.get('post2').add('user1').add('user4').add('user5');
  DB.likes.get('post4').add('user1').add('user2').add('user3').add('user4');
  
  // Комментарии
  const comments = [
    {
      id: 'comment1',
      postId: 'post1',
      authorId: 'user2',
      text: 'Огонь! Как давно учишь Vue?',
      parentId: null,
      createdAt: '2024-01-20T09:45:00Z'
    },
    {
      id: 'comment2',
      postId: 'post1',
      authorId: 'user4',
      text: 'Поздравляю! #vue кайф 🎉',
      parentId: null,
      createdAt: '2024-01-20T10:12:00Z'
    },
    {
      id: 'comment3',
      postId: 'post2',
      authorId: 'user3',
      text: 'Согласна 💜',
      parentId: null,
      createdAt: '2024-01-20T11:05:00Z'
    },
    {
      id: 'comment4',
      postId: 'post3',
      authorId: 'user1',
      text: 'Тоже недавно открыла для себя subgrid! 🔥',
      parentId: null,
      createdAt: '2024-01-20T08:30:00Z'
    }
  ];
  
  DB.comments.push(...comments);
  
  // Истории
  const stories = [
    {
      id: 'story1',
      authorId: 'user1',
      slides: [
        {
          id: 'slide1',
          type: 'text',
          text: '✨ Запустила новый проект!',
          bg: 'linear-gradient(135deg,#7C3AED,#2563EB)',
          time: '2 мин'
        },
        {
          id: 'slide2',
          type: 'text',
          text: '🚀 Vue 3 + Vite = огонь!',
          bg: 'linear-gradient(135deg,#059669,#06B6D4)',
          time: '2 мин'
        }
      ],
      createdAt: '2024-01-20T08:00:00Z'
    },
    {
      id: 'story2',
      authorId: 'user2',
      slides: [
        {
          id: 'slide3',
          type: 'text',
          text: '🔥 Weave лучшая соцсеть!',
          bg: 'linear-gradient(135deg,#DB2777,#F97316)',
          time: '15 мин'
        }
      ],
      createdAt: '2024-01-20T09:30:00Z'
    }
  ];
  
  DB.stories.push(...stories);
  stories.forEach(s => DB.storyViews.set(s.id, new Set(['user3', 'user4'])));
  
  // Сообщения
  const messages = [
    {
      id: 'msg1',
      fromId: 'user1',
      toId: 'user2',
      text: 'Привет! Как твой проект?',
      createdAt: '2024-01-20T11:00:00Z',
      read: true
    },
    {
      id: 'msg2',
      fromId: 'user2',
      toId: 'user1',
      text: 'Привет! Отлично, почти закончил',
      createdAt: '2024-01-20T11:05:00Z',
      read: true
    },
    {
      id: 'msg3',
      fromId: 'user1',
      toId: 'user3',
      text: 'Привет! Посмотри мой новый дизайн',
      createdAt: '2024-01-20T10:30:00Z',
      read: false
    }
  ];
  
  DB.messages.push(...messages);
  
  console.log('✅ Данные инициализированы');
};