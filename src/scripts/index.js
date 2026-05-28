/*
  Файл index.js является точкой входа в наше приложение
  и только он должен содержать логику инициализации нашего приложения
  используя при этом импорты из других файлов

  Из index.js не допускается что то экспортировать
*/

import { openModalWindow, closeModalWindow, setCloseModalWindowEventListeners } from "./components/modal.js";
import { enableValidation, clearValidation } from './components/validation.js';
import { 
  getUserInfo, 
  getCardList, 
  setUserInfo, 
  setUserAvatar,
  addCard,
  deleteCard,
  changeLikeCardStatus 
} from './components/api.js';

// Создание объекта с настройками валидации
const validationSettings = {
  formSelector: '.popup__form',
  inputSelector: '.popup__input',
  submitButtonSelector: '.popup__button',
  inactiveButtonClass: 'popup__button_disabled',
  inputErrorClass: 'popup__input_type_error',
  errorClass: 'popup__error_visible'
};

// включение валидации вызовом enableValidation
enableValidation(validationSettings);

// DOM узлы
const placesWrap = document.querySelector(".places__list");
const profileFormModalWindow = document.querySelector(".popup_type_edit");
const profileForm = profileFormModalWindow.querySelector(".popup__form");
const profileTitleInput = profileForm.querySelector(".popup__input_type_name");
const profileDescriptionInput = profileForm.querySelector(".popup__input_type_description");

const cardFormModalWindow = document.querySelector(".popup_type_new-card");
const cardForm = cardFormModalWindow.querySelector(".popup__form");
const cardNameInput = cardForm.querySelector(".popup__input_type_card-name");
const cardLinkInput = cardForm.querySelector(".popup__input_type_url");

const imageModalWindow = document.querySelector(".popup_type_image");
const imageElement = imageModalWindow.querySelector(".popup__image");
const imageCaption = imageModalWindow.querySelector(".popup__caption");

const openProfileFormButton = document.querySelector(".profile__edit-button");
const openCardFormButton = document.querySelector(".profile__add-button");

const profileTitle = document.querySelector(".profile__title");
const profileDescription = document.querySelector(".profile__description");
const profileAvatar = document.querySelector(".profile__image");

const avatarFormModalWindow = document.querySelector(".popup_type_edit-avatar");
const avatarForm = avatarFormModalWindow.querySelector(".popup__form");
const avatarInput = avatarForm.querySelector(".popup__input");

const statsPopup = document.querySelector(".popup_type_info");

let currentUserId = null;
let allCards = [];

const handlePreviewPicture = ({ name, link }) => {
  imageElement.src = link;
  imageElement.alt = name;
  imageCaption.textContent = name;
  openModalWindow(imageModalWindow);
};

// Функция показа статистики
const showStats = () => {
  if (!statsPopup) return;
  if (!allCards.length) return;
  
  // Очищаем контейнеры
  const statsInfo = statsPopup.querySelector('.popup__info');
  const statsList = statsPopup.querySelector('.popup__list');
  statsInfo.innerHTML = '';
  statsList.innerHTML = '';
  
  // Собираем всех пользователей с их лайками
  const usersMap = new Map();
  
  // Добавляем текущего пользователя
  usersMap.set(currentUserId, { 
    name: profileTitle.textContent, 
    likeCount: 0 
  });
  
  // Собираем пользователей из лайков
  allCards.forEach(card => {
    if (card && card.likes) {
      card.likes.forEach(like => {
        if (!usersMap.has(like._id)) {
          usersMap.set(like._id, { 
            name: like.name || `Пользователь ${like._id.slice(-6)}`, 
            likeCount: 0 
          });
        }
      });
    }
  });
  
  // Собираем владельцев карточек, которых еще нет
  allCards.forEach(card => {
    if (card && card.owner && !usersMap.has(card.owner._id)) {
      usersMap.set(card.owner._id, { 
        name: `Пользователь ${card.owner._id.slice(-6)}`, 
        likeCount: 0 
      });
    }
  });
  
  // Считаем лайки для каждого пользователя
  allCards.forEach(card => {
    if (card && card.likes) {
      card.likes.forEach(like => {
        const user = usersMap.get(like._id);
        if (user) user.likeCount += 1;
      });
    }
  });
  
  const usersList = Array.from(usersMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.likeCount - a.likeCount);
  
  // Топ карточек по лайкам
  const topCards = [...allCards]
    .filter(card => card && card.likes)
    .sort((a, b) => b.likes.length - a.likes.length)
    .slice(0, 3);
  
  // Общая статистика
  const totalUsers = usersMap.size;
  const totalLikes = allCards.reduce((sum, card) => sum + (card.likes ? card.likes.length : 0), 0);
  const maxLikesFromOne = usersList[0]?.likeCount || 0;
  const championName = usersList[0]?.id === currentUserId ? profileTitle.textContent : (usersList[0]?.name || '-');
  
  // Заполняем заголовок
  statsPopup.querySelector('.popup__title').textContent = 'Статистика карточек';
  
  // Заполняем информацию
  const statsData = [
    { term: 'Всего пользователей:', description: totalUsers },
    { term: 'Всего лайков:', description: totalLikes },
    { term: 'Максимально лайков от одного:', description: maxLikesFromOne },
    { term: 'Чемпион лайков:', description: championName }
  ];
  
  statsData.forEach(stat => {
    const infoItem = document.createElement('div');
    infoItem.className = 'popup__info-item';
    infoItem.innerHTML = `
      <dt class="popup__info-term">${stat.term}</dt>
      <dd class="popup__info-description">${stat.description}</dd>
    `;
    statsInfo.appendChild(infoItem);
  });
  
  // Заполняем текст и список популярных карточек
  statsPopup.querySelector('.popup__text').textContent = 'Популярные карточки:';
  
  if (topCards.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'popup__list-item';
    emptyItem.textContent = 'Нет карточек';
    statsList.appendChild(emptyItem);
  } else {
    topCards.forEach(card => {
      const cardItem = document.createElement('li');
      cardItem.className = 'popup__list-item popup__list-item_type_badge';
      cardItem.textContent = card.name;
      statsList.appendChild(cardItem);
    });
  }
  
  openModalWindow(statsPopup);
};

// Функция создания карточки
const createCard = (cardData, userId) => {
  const cardTemplate = document.querySelector('#card-template').content;
  const cardElement = cardTemplate.querySelector('.card').cloneNode(true);
  
  const cardImage = cardElement.querySelector('.card__image');
  const cardTitle = cardElement.querySelector('.card__title');
  const likeButton = cardElement.querySelector('.card__like-button');
  const likeCount = cardElement.querySelector('.card__like-count');
  const deleteButton = cardElement.querySelector('.card__control-button_type_delete');
  
  cardImage.src = cardData.link;
  cardImage.alt = cardData.name;
  cardTitle.textContent = cardData.name;
  likeCount.textContent = cardData.likes.length;
  
  // Проверяем, лайкнул ли текущий пользователь
  const isLiked = cardData.likes.some(like => like._id === userId);
  if (isLiked) likeButton.classList.add('card__like-button_is-active');
  
  // Обработчик лайка
  likeButton.addEventListener('click', () => {
    const isCurrentlyLiked = likeButton.classList.contains('card__like-button_is-active');
    
    changeLikeCardStatus(cardData._id, isCurrentlyLiked)
      .then((updatedCard) => {
        likeCount.textContent = updatedCard.likes.length;
        likeButton.classList.toggle('card__like-button_is-active');
        
        const cardIndex = allCards.findIndex(c => c._id === cardData._id);
        if (cardIndex !== -1) allCards[cardIndex] = updatedCard;
      })
      .catch((err) => console.log('Ошибка при обновлении лайка:', err));
  });
  
  // Показываем кнопку удаления только для своих карточек
  if (cardData.owner._id === userId) {
    deleteButton.style.display = 'block';
    deleteButton.addEventListener('click', () => {
      deleteCard(cardData._id)
        .then(() => {
          cardElement.remove();
          const cardIndex = allCards.findIndex(c => c._id === cardData._id);
          if (cardIndex !== -1) allCards.splice(cardIndex, 1);
        })
        .catch((err) => console.log('Ошибка при удалении карточки:', err));
    });
  } else {
    deleteButton.style.display = 'none';
  }
  
  cardImage.addEventListener('click', () => {
    handlePreviewPicture({ name: cardData.name, link: cardData.link });
  });
  
  return cardElement;
};

const handleProfileFormSubmit = (evt) => {
  evt.preventDefault();
  
  const submitButton = profileForm.querySelector('.popup__button');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Сохранение...';
  submitButton.disabled = true;
  
  setUserInfo({
    name: profileTitleInput.value,
    about: profileDescriptionInput.value,
  })
    .then((userData) => {
      profileTitle.textContent = userData.name;
      profileDescription.textContent = userData.about;
      closeModalWindow(profileFormModalWindow);
    })
    .catch((err) => console.log('Ошибка при обновлении профиля:', err))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
};

const handleAvatarFormSubmit = (evt) => {
  evt.preventDefault();
  
  const submitButton = avatarForm.querySelector('.popup__button');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Сохранение...';
  submitButton.disabled = true;
  
  setUserAvatar(avatarInput.value)
    .then((userData) => {
      profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
      closeModalWindow(avatarFormModalWindow);
      avatarForm.reset();
    })
    .catch((err) => console.log('Ошибка при обновлении аватара:', err))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
};

const handleCardFormSubmit = (evt) => {
  evt.preventDefault();
  
  const submitButton = cardForm.querySelector('.popup__button');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Создание...';
  submitButton.disabled = true;
  
  addCard({
    name: cardNameInput.value,
    link: cardLinkInput.value,
  })
    .then((newCard) => {
      const cardElement = createCard(newCard, currentUserId);
      placesWrap.prepend(cardElement);
      allCards.unshift(newCard);
      closeModalWindow(cardFormModalWindow);
      cardForm.reset();
    })
    .catch((err) => console.log('Ошибка при добавлении карточки:', err))
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
};

// Функция для отображения всех карточек
const renderCards = (cards, userId) => {
  placesWrap.innerHTML = '';
  allCards = cards;
  cards.forEach((cardData) => {
    const cardElement = createCard(cardData, userId);
    placesWrap.append(cardElement);
  });
};

// Загрузка начальных данных с сервера
Promise.all([getCardList(), getUserInfo()])
  .then(([cards, userData]) => {
    currentUserId = userData._id;
    profileTitle.textContent = userData.name;
    profileDescription.textContent = userData.about;
    profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
    renderCards(cards, currentUserId);
  })
  .catch((err) => console.log('Ошибка при загрузке данных:', err));

// EventListeners
profileForm.addEventListener("submit", handleProfileFormSubmit);
cardForm.addEventListener("submit", handleCardFormSubmit);
avatarForm.addEventListener("submit", handleAvatarFormSubmit);

openProfileFormButton.addEventListener("click", () => {
  profileTitleInput.value = profileTitle.textContent;
  profileDescriptionInput.value = profileDescription.textContent;
  clearValidation(profileForm, validationSettings);
  openModalWindow(profileFormModalWindow);
});

profileAvatar.addEventListener("click", () => {
  avatarForm.reset();
  clearValidation(avatarForm, validationSettings);
  openModalWindow(avatarFormModalWindow);
});

openCardFormButton.addEventListener("click", () => {
  cardForm.reset();
  clearValidation(cardForm, validationSettings);
  openModalWindow(cardFormModalWindow);
});

// Обработчик на логотип
const logo = document.querySelector(".header__logo");
if (logo) {
  logo.style.cursor = "pointer";
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    showStats();
  });
}

// настраиваем обработчики закрытия попапов
document.querySelectorAll(".popup").forEach((popup) => {
  setCloseModalWindowEventListeners(popup);
});