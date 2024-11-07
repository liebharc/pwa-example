'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { subscribeUser, unsubscribeUser, sendNotification } from './actions';

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function PushNotificationManager() {
	const [isSupported, setIsSupported] = useState(false);
	const [subscription, setSubscription] = useState<PushSubscription | null>(
		null
	);
	const [message, setMessage] = useState('');

	useEffect(() => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			setIsSupported(true);
			registerServiceWorker();
		}
	}, []);

	async function registerServiceWorker() {
		const registration = await navigator.serviceWorker.register('/sw.js', {
			scope: '/',
			updateViaCache: 'none',
		});
		const sub = await registration.pushManager.getSubscription();
		setSubscription(sub);
	}

	async function subscribeToPush() {
		const registration = await navigator.serviceWorker.ready;
		const sub = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(
				process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
			),
		});
		setSubscription(sub);
		await subscribeUser(sub);
	}

	async function unsubscribeFromPush() {
		await subscription?.unsubscribe();
		setSubscription(null);
		await unsubscribeUser();
	}

	async function sendTestNotification() {
		if (subscription) {
			await sendNotification(message);
			setMessage('');
		}
	}

	if (!isSupported) {
		return <p>Push notifications are not supported in this browser.</p>;
	}

	return (
		<div>
			<h3>Push Notifications</h3>
			{subscription ? (
				<>
					<p>You are subscribed to push notifications.</p>
					<button onClick={unsubscribeFromPush}>Unsubscribe</button>
					<input
						type="text"
						placeholder="Enter notification message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
					<button onClick={sendTestNotification}>Send Test</button>
				</>
			) : (
				<>
					<p>You are not subscribed to push notifications.</p>
					<button onClick={subscribeToPush}>Subscribe</button>
				</>
			)}
		</div>
	);
}

function InstallPrompt() {
	const [isIOS, setIsIOS] = useState(false);
	const [isStandalone, setIsStandalone] = useState(false);
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		setIsIOS(
			/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream // eslint-disable-line @typescript-eslint/no-explicit-any
		);

		setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

		const handleBeforeInstallPrompt = (e: any) => {
			// eslint-disable-line @typescript-eslint/no-explicit-any
			e.preventDefault(); // Prevent automatic prompt
			setDeferredPrompt(e); // Save the event to trigger later
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// Cleanup event listener on component unmount
		return () =>
			window.removeEventListener(
				'beforeinstallprompt',
				handleBeforeInstallPrompt
			);
	}, []);

	const handleInstallClick = async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt(); // Show the install prompt
			const choiceResult = await deferredPrompt.userChoice;
			if (choiceResult.outcome === 'accepted') {
				console.log('User accepted the install prompt');
			} else {
				console.log('User dismissed the install prompt');
			}
			setDeferredPrompt(null); // Clear the prompt event after use
		}
	};

	if (isStandalone) {
		return null; // Don't show install button if already installed
	}

	return (
		<div>
			<h3>Install App</h3>
			<button onClick={handleInstallClick}>Add to Home Screen</button>
			{isIOS && (
				<p>
					To install this app on your iOS device, tap the share button
					<span role="img" aria-label="share icon">
						{' '}
						⎋{' '}
					</span>
					and then &quot;Add to Home Screen&quot;
					<span role="img" aria-label="plus icon">
						{' '}
						➕{' '}
					</span>
					.
				</p>
			)}
			{!isIOS && deferredPrompt && (
				<p>
					Click Add to Home Screen to install this app on your Android device.
				</p>
			)}
		</div>
	);
}

export default function Home() {
	return (
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
			<PushNotificationManager />
			<InstallPrompt />
			<main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
				<Image
					className="dark:invert"
					src="/next.svg"
					alt="Next.js logo"
					width={180}
					height={38}
					priority
				/>
			</main>
		</div>
	);
}
