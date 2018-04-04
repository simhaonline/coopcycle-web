<?php

namespace AppBundle\Sylius\Cart;

use AppBundle\Entity\RestaurantRepository;
use Sylius\Component\Order\Context\CartContextInterface;
use Sylius\Component\Order\Context\CartNotFoundException;
use Sylius\Component\Order\Model\OrderInterface;
use Sylius\Component\Order\Repository\OrderRepositoryInterface;
use Sylius\Component\Resource\Factory\FactoryInterface;
use Symfony\Component\HttpFoundation\Session\SessionInterface;

final class RestaurantCartContext implements CartContextInterface
{
    private $session;

    private $orderRepository;

    private $orderFactory;

    private $restaurantRepository;

    private $sessionKeyName;

    /**
     * @param SessionInterface $session
     * @param OrderRepositoryInterface $orderRepository
     * @param string $sessionKeyName
     */
    public function __construct(
        SessionInterface $session,
        OrderRepositoryInterface $orderRepository,
        FactoryInterface $orderFactory,
        RestaurantRepository $restaurantRepository,
        string $sessionKeyName)
    {
        $this->session = $session;
        $this->orderRepository = $orderRepository;
        $this->orderFactory = $orderFactory;
        $this->restaurantRepository = $restaurantRepository;
        $this->sessionKeyName = $sessionKeyName;
    }

    /**
     * {@inheritdoc}
     */
    public function getCart(): OrderInterface
    {
        if (!$this->session->has('restaurantId')) {
            throw new CartNotFoundException('There is no restaurant in session');
        }

        if (!$this->session->has($this->sessionKeyName)) {
            $restaurant = $this->restaurantRepository->find($this->session->get('restaurantId'));

            return $this->orderFactory->createForRestaurant($restaurant);
        }

        $cart = $this->orderRepository->findCartById($this->session->get($this->sessionKeyName));

        if (null === $cart) {
            $this->session->remove($this->sessionKeyName);

            throw new CartNotFoundException('Unable to find the cart in session');
        }

        return $cart;
    }
}
