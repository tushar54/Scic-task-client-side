import { Outlet } from "react-router-dom";
import Navbar from "../AllComponent/Navbar";
import Footer from "../AllComponent/Footer";


const Home = () => {
    return (
        <div>
           <div className="container mx-auto"> <Navbar></Navbar></div>
            <div className="min-h-screen">
                <Outlet></Outlet>
            </div>
            <Footer></Footer>
        </div>
    );
};

export default Home;