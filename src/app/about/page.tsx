import { StyledLink } from '@/components/atoms/StyledLink/StyledLink';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { Typography } from '@/components/ui/typography';

const About = () => {
	return (
		<AppLayout>
			<Typography>Who We Are</Typography>
			<Typography variant="p">
				From{' '}
				<StyledLink href="https://www.starlingphotostudios.com/" target="_blank">
					Starling
				</StyledLink>
				, we know what it takes to reach out to others; build your network, start working
				in your field, and build your business. Our philosophy is uncompromising, we pride
				ourselves in doing everything it takes for each and every single one of our
				clients. This approach allowed us to go from starting the business to working with
				U.S. Presidents and Fortune 500 companies in only a matter of months. It’s our
				goal to give you an insight into what we did to reach out to so many businesses.
			</Typography>
			<Typography variant="p">
				When we first started, we reasoned that our biggest barrier was that no one knew
				about the business. From the beginning, we worked to build our own email tools so
				we could reach the people we needed. We communicated with thousands of businesses
				from the very beginning offering humble introductions. This provided us with our
				first foundation and built us countless connections.{' '}
			</Typography>
			<Typography variant="p">
				Starling is a multidisciplinary media company based out of Philadelphia,
				Pennsylvania. We’ve been serving the surrounding East Coast and beyond for years,
				providing dynamic, individually tailored creative services. Our business
				constantly travels for work across the continental United States, working with
				prominent clients. As a service business we understand that digital media
				fundamentally underpins the world we live in. It is our core mission to provide
				the vision to capture life in a way that lasts.
			</Typography>
			<Typography variant="p">
				We approach software with the highest degree of excellence and craftsmanship. From
				our years of experience providing the highest quality photo and video work, we’ve
				built a team of developers making Murmur possible to pursue. What we aimed to
				build started from our own needs. One of our founders developed the tool for
				internal use early on to gain a cutting edge with our own outreach. Everyone at
				Starling knew that our approach to outreach was different, and we want to bring
				that approach to you and the rest of the world to help provide the best possible
				tool for outreach, and give a true competitive edge in an oversaturated digital
				world.
			</Typography>
			<Typography variant="p">
				We’re here for every single one of our customers as a software business in the
				same way that we have been here for our clients as a media and marketing business.
				Reach out with questions at any time day or night and we’ll make sure to help you
				to the best of our ability. We are customer-oriented and we want to share the love
				of our craft with you!
			</Typography>
		</AppLayout>
	);
};

export default About;
