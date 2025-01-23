<?php

require 'vendor/autoload.php';

use Illuminate\Validation\Factory;
use Illuminate\Translation\FileLoader;
use Illuminate\Translation\Translator;
use Symfony\Component\Mailer\Transport\SendmailTransport;
use Symfony\Component\Mailer\Mailer as SymfonyMailer;
use Symfony\Component\Mime\Email;
use Illuminate\Validation\ValidationException;

// Set up the translator and validator factory
$loader = new FileLoader(new Illuminate\Filesystem\Filesystem(), __DIR__);
$translator = new Translator($loader, 'en');
$validatorFactory = new Factory($translator);

// Capture form data
$data = [
    'name' => $_POST['name'] ?? null,
    'email' => $_POST['email'] ?? null,
    'phone' => $_POST['phone'] ?? null,
    'message' => $_POST['message'] ?? null,
];

// Define validation rules
$rules = [
    'name' => 'required|string|max:255',
    'email' => 'required|email|max:255',
    'phone' => 'nullable|regex:/^(\+?[0-9]{10,15}|[0-9]{3}-[0-9]{3}-[0-9]{4})$/',
    'message' => 'required|string|max:5000',
];

// Define custom error messages
$messages = [
    'name.required' => 'The name field is required.',
    'email.required' => 'The email field is required.',
    'email.email' => 'Please provide a valid email address.',
    'phone.regex' => 'Please provide a valid phone number in the format ###-###-#### or ##########.',
    'message.required' => 'The message field is required.',
];

try {
    // Validate the data
    $validator = $validatorFactory->make($data, $rules, $messages);
    $validator->validate();

    // Use PHP's built-in mail transport
    $transport = new SendmailTransport();
    $mailer = new SymfonyMailer($transport);

    // Create the email
    $email = (new Email())
        ->from('your_email@example.com')
        ->to('fub31@followupboss.me')
        ->subject('New Lead')
        ->text(
            "You have a new lead:\n\n" .
            "Name: {$data['name']}\n" .
            "Email: {$data['email']}\n" .
            "Phone: {$data['phone']}\n" .
            "Message:\n{$data['message']}"
        );

    // Send the email
    $mailer->send($email);

    echo json_encode(['status' => 'success', 'message' => 'Message sent successfully.']);
} catch (ValidationException $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'errors' => $e->errors()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An error occurred while sending the message.', 'errors' => [$e->getMessage()]]);
}
