<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $message = htmlspecialchars($_POST['message']);

    // Email to admin
    $to = "kyleforeman.design@gmail.com"; // Replace with your email
    $subject = "New Contact Form Submission";
    $headers = "From: $email";

    $body = "Name: $name\nEmail: $email\nPhone: $phone\nMessage: $message";

    if (mail($to, $subject, $body, $headers)) {
        echo "Thank you for reaching out. We will get back to you soon!";
    } else {
        echo "Sorry, something went wrong. Please try again.";
    }
}
?>
