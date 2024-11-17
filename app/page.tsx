'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
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
			<InstallPrompt />
		</div>
	);
}
