# Jiji-style moderation workflow notes

Jiji’s official FAQ describes a seller lifecycle in which every ad goes for review after submission, remains hidden from search until it passes review, and then becomes live. Sellers can manage the ad under **My Adverts**, receive an email when the ad is active or when edits are required, and an edited active ad goes through review again. Jiji also states that duplicate ads do not go live. Source: [Jiji — What happens after I click on Post ad?](https://jiji.ng/faq/what-happens-after-posting).

Jiji’s official declined-ad FAQ describes decline reasons such as multiple items in one ad, nudity/contact details/watermarks in images, or an unrealistic price. It tells sellers to make the required edits and submit again. Source: [Jiji — My ad has been declined. Why?](https://jiji.ng/faq/why-ad-declined).

Jiji’s moderation-duration FAQ says most ads are reviewed within a few hours, sellers receive email or push notifications, and statuses can include Active, On moderation, and Declined. Source: [Jiji — How long does ad moderation take?](https://jiji.ng/faq/moderation-duration).

Bese26 implementation decision: mirror the lifecycle and status clarity, not Jiji’s private internal UI. Sellers submit as Pending; only the designated admin/moderator panel can review; Approve changes a listing to active/approved and makes it public on Home; Reject stores a reason and keeps the listing out of public Home. Any later moderator team must be assigned through controlled role management, never by ordinary users.
