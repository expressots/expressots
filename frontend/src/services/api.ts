
const  updatePlayer = async (data?: any) => {

    return new Promise((resolve) => {
        setTimeout(resolve,2000)
    })

    //reject
    return new Promise((resolve, reject) => {
        setTimeout(reject,2000)
    })

}

export const api = {
    updatePlayer
}

