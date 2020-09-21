import transferUserToAmrs from "./copy-over-user";
import UserMap from "./user-map";

console.log('Starting application..');

async function start() {
    let map = [];
    await UserMap.instance.initialize();
    let users: any = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
        '22',
        '29',
        '44',
        '45',
        '55',
        '58',
        '64',
        '65',
        '66',
        '68',
        '69',
        '70',
        '71',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '30',
        '32',
        '33',
        '34',
        '35',
        '36',
        '37',
        '38',
        '39',
        '40',
        '41',
        '42',
        '43',
        '46',
        '47',
        '48',
        '49',
        '50',
        '51',
        '52',
        '53',
        '54',
        '56',
        '57',
        '59',
        '60',
        '61',
        '62',
        '63',
        '67'
    ]
    for (const user of users) {
        console.log("Migrating amrsUserID", user)
        const amrsUserID = await transferUserToAmrs(user)
        console.log("amrsUserID", user)
        let userId=amrsUserID;
        if(amrsUserID === ''){
            userId = parseInt(user);
        }
        map.push(parseInt(user) +":"+ userId)
        
    }
    console.info("Map", map)
}

start();