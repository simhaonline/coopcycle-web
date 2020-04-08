<?php

namespace Tests\AppBundle\Domain\Order\Handler;

use AppBundle\DataType\TsRange;
use AppBundle\Domain\Order\Command\Checkout;
use AppBundle\Domain\Order\Event\CheckoutFailed;
use AppBundle\Domain\Order\Event\CheckoutSucceeded;
use AppBundle\Domain\Order\Handler\CheckoutHandler;
use AppBundle\Entity\Sylius\Order;
use AppBundle\Entity\Sylius\Payment;
use AppBundle\Service\StripeManager;
use AppBundle\Sylius\Order\OrderInterface;
use AppBundle\Utils\OrderTimeHelper;
use PHPUnit\Framework\TestCase;
use SimpleBus\Message\Recorder\RecordsMessages;
use Stripe;
use Sylius\Bundle\OrderBundle\NumberAssigner\OrderNumberAssignerInterface;
use Sylius\Component\Payment\Model\PaymentInterface;
use Prophecy\Argument;

class CheckoutHandlerTest extends TestCase
{
    private $eventRecorder;
    private $orderNumberAssigner;
    private $stripeManager;

    private $handler;
    private $asap;

    public function setUp(): void
    {
        $this->eventRecorder = $this->prophesize(RecordsMessages::class);
        $this->orderNumberAssigner = $this->prophesize(OrderNumberAssignerInterface::class);
        $this->stripeManager = $this->prophesize(StripeManager::class);

        $this->orderTimeHelper = $this->prophesize(OrderTimeHelper::class);

        $this->asap = (new \DateTime())->format(\DateTime::ATOM);
        $this->shippingTimeRange = new TsRange();

        $this->orderTimeHelper
            ->getAvailabilities(Argument::type(OrderInterface::class))
            ->willReturn([]);

        $this->orderTimeHelper
            ->getAsap(Argument::type(OrderInterface::class))
            ->willReturn($this->asap);

        $this->orderTimeHelper
            ->getShippingTimeRange(Argument::type(OrderInterface::class))
            ->willReturn($this->shippingTimeRange);

        $this->handler = new CheckoutHandler(
            $this->eventRecorder->reveal(),
            $this->orderNumberAssigner->reveal(),
            $this->stripeManager->reveal(),
            $this->orderTimeHelper->reveal()
        );
    }

    public function testCheckoutLegacy()
    {
        $payment = new Payment();
        $payment->setState(PaymentInterface::STATE_CART);

        $charge = Stripe\Charge::constructFrom([
            'id' => 'ch_123456',
        ]);

        $order = new Order();
        $order->addPayment($payment);

        $this->stripeManager
            ->authorize($payment)
            ->willReturn($charge);

        $this->eventRecorder
            ->record(Argument::type(CheckoutSucceeded::class))
            ->shouldBeCalled();

        $command = new Checkout($order, 'tok_123456');

        call_user_func_array($this->handler, [$command]);

        $this->assertNotNull($order->getShippedAt());
        $this->assertEquals(new \DateTime($this->asap), $order->getShippedAt());
        $this->assertEquals('ch_123456', $payment->getCharge());
    }

    public function testCheckoutWithPaymentIntent()
    {
        $payment = new Payment();
        $payment->setState(PaymentInterface::STATE_CART);

        $paymentIntent = Stripe\PaymentIntent::constructFrom([
            'id' => 'pi_12345678',
            'status' => 'requires_source_action',
            'next_action' => [
                'type' => 'use_stripe_sdk'
            ],
            'client_secret' => ''
        ]);
        $payment->setPaymentIntent($paymentIntent);

        $order = new Order();
        $order->addPayment($payment);

        $this->stripeManager
            ->confirmIntent($payment)
            ->willReturn($paymentIntent);

        $this->eventRecorder
            ->record(Argument::type(CheckoutSucceeded::class))
            ->shouldBeCalled();

        $command = new Checkout($order, 'pi_12345678');

        call_user_func_array($this->handler, [$command]);

        $this->assertNotNull($order->getShippedAt());
        $this->assertEquals(new \DateTime($this->asap), $order->getShippedAt());
    }

    public function testCheckoutFailed()
    {
        $payment = new Payment();
        $payment->setState(PaymentInterface::STATE_CART);

        $paymentIntent = Stripe\PaymentIntent::constructFrom([
            'id' => 'pi_12345678',
            'status' => 'requires_source_action',
            'next_action' => [
                'type' => 'use_stripe_sdk'
            ],
            'client_secret' => ''
        ]);
        $payment->setPaymentIntent($paymentIntent);

        $order = new Order();
        $order->addPayment($payment);

        $this->stripeManager
            ->confirmIntent($payment)
            ->willThrow(new \Exception('Lorem ipsum'));

        $this->eventRecorder
            ->record(Argument::type(CheckoutSucceeded::class))
            ->shouldNotBeCalled();

        $this->eventRecorder
            ->record(Argument::type(CheckoutFailed::class))
            ->shouldBeCalled();

        $command = new Checkout($order, 'tok_123456');

        call_user_func_array($this->handler, [$command]);

        $this->assertNull($order->getShippedAt());
    }

    public function testCheckoutWithFreeOrder()
    {
        $order = $this->prophesize(Order::class);

        $order
            ->getLastPayment(PaymentInterface::STATE_CART)
            ->willReturn(null);
        $order
            ->isEmpty()
            ->willReturn(false);
        $order
            ->getItemsTotal()
            ->willReturn(1000);
        $order
            ->getTotal()
            ->willReturn(0);
        $order
            ->getShippedAt()
            ->willReturn(null);
        $order
            ->getShippingTimeRange()
            ->willReturn(null);

        $this->stripeManager
            ->confirmIntent(Argument::type(Payment::class))
            ->shouldNotBeCalled();
        $this->stripeManager
            ->authorize(Argument::type(Payment::class))
            ->shouldNotBeCalled();

        $order
            ->setShippedAt(new \DateTime($this->asap))
            ->shouldBeCalled();
        $order
            ->setShippingTimeRange(Argument::type(TsRange::class))
            ->shouldBeCalled();
        $this->eventRecorder
            ->record(Argument::type(CheckoutSucceeded::class))
            ->shouldBeCalled();

        $command = new Checkout($order->reveal());

        call_user_func_array($this->handler, [$command]);
    }
}
