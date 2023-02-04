import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import axios from "axios"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<any> {
    const f = (req.query.f || (req.body && req.body.f));

    const responseMessage: string = await map(f);

    context.res = {
        body: responseMessage
    };
};

export default httpTrigger;

async function map(map: string): Promise<string> {
    const id = "6492127";
    switch (map) {
        case 'ranking': return ranking(id);
        case 'lastresult': return last(id);
        case 'game': return game(id);
        default: return "Not a command";
    }
}

// Function
async function game(id: string): Promise<string> {
    const url: string = `https://aoe4world.com/api/v0/players/${id}/games/last`

    let data: any = aoe4worldConnector(url).then((data: any) => {
        let result: string = "";
        if (data.ongoing) {
            data.teams.forEach(function (team: any, idx: number, arr: any) {
                team.forEach(function (teammate: any, idx: number, arr: any) {
                    result += `${teammate.name} [${ref_civ(teammate.civilization)}] (${get_ranklevel(teammate.modes, data.leaderboard, 0b0)})`;
                    if (idx !== arr.length - 1) { result += " - "; }
                });

                if (idx !== arr.length - 1) { result += " vs "; }
            });

            result += ` sur ${data.map}`;
        }
        else { result = "Pas de match en cours"; }

        return result;
    });

    return data;
}

// xxx est actuellement Conquerant 1 (xxxx points) - #827 en solo et unranked en multi
async function ranking(id: string): Promise<string> {
    const url: string = `https://aoe4world.com/api/v0/players/${id}`

    let data: any = aoe4worldConnector(url).then((data: any) => {
        return `${data.name} est actuellement ${get_ranklevel(data.modes, "rm_solo", 0b110)} en solo et ${get_ranklevel(data.modes, "rm_team", 0b10)} en multi`
    });

    return data;
}

async function last(id: string): Promise<string> {
    const url: string = `https://aoe4world.com/api/v0/players/${id}/games?limit=2`

    let data: any = aoe4worldConnector(url).then((data: any) => {
        for (var game of data.games) {
            if (!game.ongoing) {
                var player = game.teams.find((team: any) => team.find((x: any) => x.player.profile_id == id));

                let victory = ref_winloss(player[0].player.result);

                return `Le dernier match était une ${victory}`
            }
        }
    });

    return data;
}

// Connector
async function aoe4worldConnector(url: string): Promise<any> {
    const promise = axios.get(url)
    return promise.then((response) => response.data)
}

// feature
function get_ranklevel(modes: any, mode_select: string, detail: number) {
    if (modes == undefined) { return "unranked"; }

    let mode: any;

    switch (mode_select) {
        case 'rm_solo': mode = modes?.rm_solo; detail = detail | 0b100; break;
        case 'rm_team': mode = modes?.rm_team; break;
    }

    if (mode == undefined) { return "unranked"; }
    if (mode.rank_level == undefined) { return "unranked"; }

    var rank = mode.rank_level.split('_')[0];
    var rankFr = ref_rank(rank);

    var lvl = (rank != "unranked" ? mode.rank_level.split('_')[1] : "");
    var result = `${rankFr} ${lvl}`

    if (detail & 0b10) { result += ` (${mode.rating} points)` }
    if (detail & 0b100) { result += ` - #${mode.rank}` }

    return result;
}

// referentiel
function ref_winloss(win: string) {
    switch (win) {
        case 'loss': return "défaite";
        case 'win': return "victoire";
        default: return "…";
    }
}

function ref_rank(rank: string) {
    switch (rank) {
        case 'bronze': return "Bronze"
        case 'silver': return "Argent"
        case 'gold': return "Or"
        case 'platinum': return "Platine"
        case 'diamond': return "Diamant"
        case 'conqueror': return "Conquerant"
        default: return "Unranked"
    }
}

function ref_civ(civ: string) {
    switch (civ) {
        case 'abbasid_dynasty': return "Abbasides"
        case 'chinese': return "Chinois"
        case 'delhi_sultanate': return "Delhi"
        case 'french': return "Français"
        case 'english': return "Anglais"
        case 'holy_roman_empire': return "HRE"
        case 'mongols': return "Mongols"
        case 'rus': return "Rus'"
        case 'ottomans': return "Ottomans"
        case 'malians': return "Maliens"
        default: return "";
    }
}