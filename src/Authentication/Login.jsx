import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import axios from 'axios';



const GoogleLogin = () => {
    const navigate=useNavigate()
    const { googleSignIn } = useAuth();
    const signin= async()=>{
       await googleSignIn()
       .then(async(result)=>{
        const user=result.user
        await axios.post("https://scic-task-server-side.onrender.com/user", {
            name: user.displayName,
            email: user.email,
            imgurl: user.photoURL,
          });
        console.log(result)
        navigate('/')
       })
       .catch((error)=>{
        console.log(error)
       })
        
    }
    return (
        <div className="flex justify-center items-center min-h-screen">

            <button onClick={signin} className="px-4 py-2 bg-blue-500 text-white rounded">
                Sign in with Google
            </button>
        </div>
    );
};

export default GoogleLogin;
