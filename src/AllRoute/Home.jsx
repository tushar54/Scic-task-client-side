import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../AllComponent/Navbar";
import Footer from "../AllComponent/Footer";


const Home = () => {
    const location=useLocation()
    return (
        <div>
           <div className="container mx-auto"> <Navbar></Navbar></div>
            <div className="min-h-screen">
                {
                    location.pathname==='/'&&<div><h1 className="text-center font-bold text-2xl">You have to go Task route</h1></div>
                }
                <Outlet></Outlet>
            </div>
            <Footer></Footer>
        </div>
    );
};

export default Home;