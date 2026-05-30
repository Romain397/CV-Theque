<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\HttpFoundation\Response;

class CorsSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 100],
            KernelEvents::RESPONSE => ['onKernelResponse', 0],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        // Handle preflight requests early
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            // log preflight for debugging
            @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[OPTIONS] " . date('c') . " Origin: " . ($request->headers->get('Origin') ?? '') . " Headers: " . json_encode($request->headers->all()) . "\n", FILE_APPEND);

            $origin = $request->headers->get('Origin');
            $allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'];
            $allow = in_array($origin, $allowedOrigins, true) ? $origin : '*';

            $response = new Response('', 200);
            $response->headers->set('Access-Control-Allow-Origin', $allow);
            $response->headers->set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
            if ($allow !== '*') {
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
            }
            $response->headers->set('Access-Control-Max-Age', '3600');
            $event->setResponse($response);
        }
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        $response = $event->getResponse();
        // Add CORS headers to all responses
        // log responses for debugging
        @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[RESPONSE] " . date('c') . " Status: " . $response->getStatusCode() . " Headers: " . json_encode($response->headers->all()) . "\n", FILE_APPEND);
        $origin = $event->getRequest()->headers->get('Origin');
        $allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'];
        $allow = in_array($origin, $allowedOrigins, true) ? $origin : '*';
        $response->headers->set('Access-Control-Allow-Origin', $allow);
        $response->headers->set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
        if ($allow !== '*') {
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }
        $response->headers->set('Access-Control-Max-Age', '3600');
    }
}
