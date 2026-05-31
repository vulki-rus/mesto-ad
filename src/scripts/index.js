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
import { createCardElement, updateLikeState } from './components/card.js';

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

  const statsInfo = statsPopup.querySelector('.popup__info');
  const statsList = statsPopup.querySelector('.popup__list');
  statsInfo.innerHTML = 'Загрузка...';
  statsList.innerHTML = '';
  statsPopup.querySelector('.popup__title').textContent = 'Статистика карточек';
  
  openModalWindow(statsPopup);

  getCardList()
    .then((cards) => {
      if (!cards || !cards.length) {
        statsInfo.innerHTML = 'Нет данных';
        return;
      }

      statsInfo.innerHTML = '';
      statsList.innerHTML = '';

      const usersMap = new Map();
      usersMap.set(currentUserId, { name: profileTitle.textContent, likeCount: 0 });

      cards.forEach(card => {
        if (card?.owner && !usersMap.has(card.owner._id)) {
          usersMap.set(card.owner._id, { name: card.owner.name || `Пользователь ${card.owner._id.slice(-6)}`, likeCount: 0 });
        }
        card?.likes?.forEach(like => {
          if (!usersMap.has(like._id)) {
            usersMap.set(like._id, { name: like.name || `Пользователь ${like._id.slice(-6)}`, likeCount: 0 });
          }
        });
      });

      cards.forEach(card => {
        card?.likes?.forEach(like => {
          const user = usersMap.get(like._id);
          if (user) user.likeCount++;
        });
      });

      const usersList = Array.from(usersMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.likeCount - a.likeCount);

      const topCards = [...cards]
        .filter(c => c?.likes)
        .sort((a, b) => b.likes.length - a.likes.length)
        .slice(0, 3);

      const totalUsers = usersMap.size;
      const totalLikes = cards.reduce((sum, c) => sum + (c.likes?.length || 0), 0);
      const maxLikesFromOne = usersList[0]?.likeCount || 0;
      let championName = usersList[0]?.name || '-';
      if (usersList[0]?.id === currentUserId) championName = profileTitle.textContent;

      const statsData = [
        { term: 'Всего пользователей:', description: totalUsers },
        { term: 'Всего лайков:', description: totalLikes },
        { term: 'Максимально лайков от одного:', description: maxLikesFromOne },
        { term: 'Чемпион лайков:', description: championName }
      ];

      statsData.forEach(stat => {
        const infoItem = document.createElement('div');
        infoItem.className = 'popup__info-item';
        infoItem.innerHTML = `<dt class="popup__info-term">${stat.term}</dt><dd class="popup__info-description">${stat.description}</dd>`;
        statsInfo.appendChild(infoItem);
      });

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
    })
    .catch(() => {
      statsInfo.innerHTML = 'Ошибка загрузки данных';
    });
};

// Обработчик лайка
const handleLike = (cardId, isCurrentlyLiked, cardElement) => {
  changeLikeCardStatus(cardId, isCurrentlyLiked)
    .then((updatedCard) => {
      // Вся работа с DOM карточки вынесена в card.js
      updateLikeState(cardElement, updatedCard, !isCurrentlyLiked);
      
      // Обновляем данные в allCards
      const cardIndex = allCards.findIndex(c => c._id === cardId);
      if (cardIndex !== -1) allCards[cardIndex] = updatedCard;
    })
    .catch((err) => console.log('Ошибка при обновлении лайка:', err));
};

// Обработчик удаления
const handleDelete = (cardId, cardElement) => {
  deleteCard(cardId)
    .then(() => {
      cardElement.remove();
      allCards = allCards.filter(c => c._id !== cardId);
    })
    .catch((err) => console.log('Ошибка при удалении карточки:', err));
};

// Функция для отображения всех карточек
const renderCards = (cards, userId) => {
  // Очищаем контейнер безопасно
  while (placesWrap.firstChild) {
    placesWrap.removeChild(placesWrap.firstChild);
  }
  
  allCards = cards;
  
  cards.forEach((cardData) => {
    const cardElement = createCardElement(cardData, userId, {
      onDelete: (cardElement, cardId) => handleDelete(cardId, cardElement),
      onLike: (cardId, isCurrentlyLiked, cardElement) => 
        handleLike(cardId, isCurrentlyLiked, cardElement),
      onImageClick: (data) => handlePreviewPicture(data)
    });
    
    placesWrap.append(cardElement);
  });
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
      const cardElement = createCardElement(newCard, currentUserId, {
        onDelete: (cardElement, cardId) => handleDelete(cardId, cardElement),
        onLike: (cardId, isCurrentlyLiked, cardElement) => 
          handleLike(cardId, isCurrentlyLiked, cardElement),
        onImageClick: (data) => handlePreviewPicture(data)
      });
      
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