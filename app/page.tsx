'use client';

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
		<div className="bg-gray-100 p-5 rounded-lg">
			{subscription ? (
				<>
					<button
						onClick={unsubscribeFromPush}
						className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
					>
						Unsubscribe
					</button>
					<br />
					<br />
					<input
						type="text"
						placeholder="Enter message to yourself"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
					<br />
					<br />
					<button
						onClick={sendTestNotification}
						className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
					>
						Send Test
					</button>
				</>
			) : (
				<>
					<button
						onClick={subscribeToPush}
						className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
					>
						Subscribe
					</button>
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
			/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
		);

		setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

		const handleBeforeInstallPrompt = (e: any) => {
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
		<div className="bg-gray-100 p-5 rounded-lg">
			<button
				onClick={handleInstallClick}
				className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			>
				Add to Home Screen
			</button>
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
					Click Add to Home Screen to install
					<br />
					this app on your Android device.
				</p>
			)}
		</div>
	);
}

export default function Home() {
	return (
		<div className="flex flex-col justify-center items-center gap-12 min-w-[600px] min-h-screen">
			<h1 className="text-xl font-bold">PWA Example</h1>
			<PushNotificationManager />
			<InstallPrompt />
		</div>
	);
}
