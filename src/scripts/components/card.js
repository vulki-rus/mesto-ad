const getTemplate = () => {
  return document
    .getElementById("card-template")
    .content.querySelector(".card")
    .cloneNode(true);
};

// Функция для обновления состояния лайка на карточке
export const updateLikeState = (cardElement, updatedCard, isLiked) => {
  const likeButton = cardElement.querySelector(".card__like-button");
  const likeCount = cardElement.querySelector(".card__like-count");
  
  likeCount.textContent = updatedCard.likes.length;
  if (isLiked) {
    likeButton.classList.add("card__like-button_is-active");
  } else {
    likeButton.classList.remove("card__like-button_is-active");
  }
};

export const createCardElement = (data, userId, callbacks) => {
  const cardElement = getTemplate();
  const likeButton = cardElement.querySelector(".card__like-button");
  const deleteButton = cardElement.querySelector(".card__control-button_type_delete");
  const cardImage = cardElement.querySelector(".card__image");
  const likeCount = cardElement.querySelector(".card__like-count");

  // Заполняем данные
  cardImage.src = data.link;
  cardImage.alt = data.name;
  cardElement.querySelector(".card__title").textContent = data.name;
  likeCount.textContent = data.likes.length;

  // Состояние лайка
  const isLiked = data.likes.some(like => like._id === userId);
  if (isLiked) likeButton.classList.add("card__like-button_is-active");

  // Кнопка удаления (только для автора)
  if (data.owner._id === userId) {
    deleteButton.addEventListener("click", () => callbacks.onDelete(cardElement, data._id));
  } else {
    deleteButton.remove();
  }

  // Лайк
  likeButton.addEventListener("click", () => {
    const isCurrentlyLiked = likeButton.classList.contains("card__like-button_is-active");
    callbacks.onLike(data._id, isCurrentlyLiked, cardElement);
  });

  // Открытие фото
  cardImage.addEventListener("click", () => 
    callbacks.onImageClick({ name: data.name, link: data.link })
  );

  return cardElement;
};